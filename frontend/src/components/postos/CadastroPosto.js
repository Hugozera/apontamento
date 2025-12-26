// src/components/Postos/CadastroPosto.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';

// Função para buscar dados do CNPJ via API
const buscarDadosCNPJ = async (cnpj) => {
    try {
        cnpj = cnpj.replace(/\D/g, '');

        if (cnpj.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos');
        }

        // API gratuita da ReceitaWS (pode usar outra se preferir)
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('CNPJ não encontrado ou API indisponível');
        }

        const data = await response.json();

        return {
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || data.nome || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            municipio: data.municipio || data.cidade || '',
            uf: data.uf || '',
            cep: data.cep || '',
            telefone: data.telefone || '',
            email: data.email || '',
            atividade_principal: data.atividade_principal?.[0]?.text || '',
            data_abertura: data.data_abertura || ''
        };
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        throw error;
    }
};

const CadastroPosto = ({ show, onHide, onSuccess }) => {
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        cnpj: '',
        razaoSocial: '',
        endereco: '',
        telefone: '',
        email: '',
        responsavel: '',
        status: 'ativo'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Gerar código automaticamente a partir do nome
        if (name === 'nome') {
            const codigo = value.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '');
            setFormData(prev => ({
                ...prev,
                codigo: codigo || ''
            }));
        }

        // Formatar CNPJ
        if (name === 'cnpj') {
            const cnpjLimpo = value.replace(/\D/g, '');
            let cnpjFormatado = cnpjLimpo;

            if (cnpjLimpo.length > 2) {
                cnpjFormatado = cnpjLimpo.substring(0, 2) + '.' + cnpjLimpo.substring(2);
            }
            if (cnpjLimpo.length > 5) {
                cnpjFormatado = cnpjFormatado.substring(0, 6) + '.' + cnpjLimpo.substring(5, 8);
            }
            if (cnpjLimpo.length > 8) {
                cnpjFormatado = cnpjFormatado.substring(0, 10) + '/' + cnpjLimpo.substring(8, 12);
            }
            if (cnpjLimpo.length > 12) {
                cnpjFormatado = cnpjFormatado.substring(0, 15) + '-' + cnpjLimpo.substring(12, 14);
            }

            setFormData(prev => ({
                ...prev,
                cnpj: cnpjFormatado.substring(0, 18)
            }));
        }
    };

    const handleBuscarCNPJ = async () => {
        if (!formData.cnpj) {
            setError('Digite um CNPJ para buscar');
            return;
        }

        try {
            setBuscandoCNPJ(true);
            setError('');

            const dados = await buscarDadosCNPJ(formData.cnpj);

            setFormData(prev => ({
                ...prev,
                razaoSocial: dados.razao_social,
                endereco: `${dados.logradouro}, ${dados.numero}${dados.complemento ? ' - ' + dados.complemento : ''} - ${dados.bairro}, ${dados.municipio} - ${dados.uf}`,
                telefone: dados.telefone || '',
                email: dados.email || ''
            }));

        } catch (err) {
            setError('Erro ao buscar CNPJ: ' + err.message);
        } finally {
            setBuscandoCNPJ(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validações
        if (!formData.nome || !formData.codigo || !formData.cnpj || !formData.razaoSocial) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            setError('CNPJ inválido');
            return;
        }

        try {
            setLoading(true);

            // Verificar se a coleção 'postos' já existe, se não, será criada automaticamente
            const postosRef = collection(db, 'postos');

            // Verificar se já existe posto com mesmo código
            const existingSnapshot = await getDocs(postosRef);
            const postoExistente = existingSnapshot.docs.find(doc =>
                doc.data().codigo === formData.codigo
            );

            if (postoExistente) {
                setError('Já existe um posto com este código');
                return;
            }

            const postoData = {
                ...formData,
                cnpj: cnpjLimpo,
                dataCadastro: new Date().toISOString(),
                dataAtualizacao: new Date().toISOString()
            };

            await addDoc(postosRef, postoData);

            // Limpar formulário
            setFormData({
                nome: '',
                codigo: '',
                cnpj: '',
                razaoSocial: '',
                endereco: '',
                telefone: '',
                email: '',
                responsavel: '',
                status: 'ativo'
            });

            if (onSuccess) {
                onSuccess();
            }

            onHide();

        } catch (err) {
            console.error('Erro ao cadastrar posto:', err);
            setError('Erro ao cadastrar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Cadastrar Novo Posto</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nome do Posto *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    placeholder="Ex: Perequeté, Colinas, Colinas 25"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Código (gerado automaticamente) *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="codigo"
                                    value={formData.codigo}
                                    onChange={handleChange}
                                    placeholder="Ex: perequete, colinas"
                                    required
                                />
                                <Form.Text muted>
                                    Este código será usado para vincular usuários e registros
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>CNPJ *</Form.Label>
                        <div className="d-flex">
                            <Form.Control
                                type="text"
                                name="cnpj"
                                value={formData.cnpj}
                                onChange={handleChange}
                                placeholder="00.000.000/0000-00"
                                required
                            />
                            <Button
                                variant="outline-secondary"
                                onClick={handleBuscarCNPJ}
                                disabled={buscandoCNPJ || !formData.cnpj}
                                className="ms-2"
                            >
                                {buscandoCNPJ ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Buscando...
                                    </>
                                ) : 'Buscar CNPJ'}
                            </Button>
                        </div>
                        <Form.Text muted>
                            Digite o CNPJ e clique em "Buscar CNPJ" para preencher automaticamente
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Razão Social *</Form.Label>
                        <Form.Control
                            type="text"
                            name="razaoSocial"
                            value={formData.razaoSocial}
                            onChange={handleChange}
                            placeholder="Razão Social da empresa"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Endereço Completo</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                            placeholder="Endereço completo"
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Telefone</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleChange}
                                    placeholder="(00) 0000-0000"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>E-mail</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@empresa.com"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Responsável Principal</Form.Label>
                        <Form.Control
                            type="text"
                            name="responsavel"
                            value={formData.responsavel}
                            onChange={handleChange}
                            placeholder="Nome do gerente/gestor responsável"
                        />
                        <Form.Text muted>
                            Esta pessoa será a assinatura nos relatórios deste posto
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                            <option value="manutencao">Em Manutenção</option>
                        </Form.Select>
                    </Form.Group>

                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={onHide} className="me-2">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Cadastrando...' : 'Cadastrar Posto'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default CadastroPosto;