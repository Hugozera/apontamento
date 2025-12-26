import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../../context/AuthContext";
import { Container, Form, Button, Alert, Card, Image } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
    const navigate = useNavigate();
    const { login, loading } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const validateEmail = (email) => {
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email || !password) {
            setErrorMessage("Todos os campos são obrigatórios.");
            return;
        }

        if (!validateEmail(email)) {
            setErrorMessage("Formato de e-mail inválido.");
            return;
        }

        try {
            const { success, message, role } = await login(email, password);

            if (success) {
                navigate('/validar-pontos');
            } else {
                setErrorMessage(message || "Falha ao realizar login. Verifique suas credenciais.");
            }
        } catch (error) {
            setErrorMessage("Erro interno. Tente novamente mais tarde.");
            console.error("Login error:", error);
        }
    };

    return (
        <Container fluid className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
            <Card className="p-4 shadow" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="text-center mb-4">
                    <Image
                        src={require('../../assets/images/eaglmv.png')}
                        roundedCircle
                        style={{ width: '100px', height: '100px' }}
                    />
                    <h2 className="mt-3">Grupo Colinas - Apontamento</h2>
                    <p className="text-muted">Faça login para acessar o sistema</p>
                </div>

                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Senha</Form.Label>
                        <Form.Control
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Sua senha"
                            required
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        className="w-100 mb-3"
                        disabled={loading}
                    >
                        {loading ? "Carregando..." : "Entrar"}
                    </Button>
                </Form>
            </Card>
        </Container>
    );
};

export default Login;