import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { TextField, Button, Container, Typography, Box, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

const Login = () => {
    const [login, setLogin] = useState('');
    const [senhaPdv, setSenhaPdv] = useState('');
    const [foto, setFoto] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(true);
    const [erro, setErro] = useState('');
    const [enviar, setEnviar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const [cameraError, setCameraError] = useState('');
    const [usuarioLogado, setUsuarioLogado] = useState(null);
    const [pontosPendentes, setPontosPendentes] = useState([]);
    const [dialogAprovacao, setDialogAprovacao] = useState(false);
    const [pontoSelecionado, setPontoSelecionado] = useState(null);
    const [loginAprovador, setLoginAprovador] = useState('');
    const [senhaAprovador, setSenhaAprovador] = useState('');
    const [loadingAprovacao, setLoadingAprovacao] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Carregar usuários
    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                console.log("Buscando usuários do Firestore...");
                const querySnapshot = await getDocs(collection(db, 'users'));
                const lista = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log("Usuários carregados:", lista.length);

                // Log para debug: mostrar usuários com mesmo idLogin
                const idLoginCounts = {};
                lista.forEach(user => {
                    const idLogin = user.idLogin?.toString().trim();
                    if (idLogin) {
                        idLoginCounts[idLogin] = (idLoginCounts[idLogin] || 0) + 1;
                    }
                });

                const duplicatedLogins = Object.keys(idLoginCounts).filter(login => idLoginCounts[login] > 1);
                if (duplicatedLogins.length > 0) {
                    console.log("⚠️ IDs de login duplicados encontrados:", duplicatedLogins);
                    duplicatedLogins.forEach(login => {
                        const usersWithSameLogin = lista.filter(u => u.idLogin?.toString().trim() === login);
                        console.log(`Usuários com login ${login}:`, usersWithSameLogin.map(u => ({
                            id: u.id,
                            nome: u.name,
                            posto: u.posto,
                            senhaPdv: u.senhaPdv ? '***' : 'null'
                        })));
                    });
                }

                setUsuarios(lista);
            } catch (error) {
                console.error("Erro ao buscar lista de usuários:", error);
                setErro("Erro ao carregar dados do sistema");
            }
        };
        fetchUsuarios();
    }, []);

    // CORREÇÃO: Buscar usuário por idLogin E senha
    const buscarUsuarioPorIdLoginESenha = (idLogin, senha) => {
        const loginStr = idLogin.toString().trim();

        // Buscar TODOS os usuários com esse idLogin
        const usuariosComMesmoLogin = usuarios.filter(u =>
            u.idLogin?.toString().trim() === loginStr
        );

        console.log(`🔍 Buscando usuário com login: ${loginStr}`);
        console.log(`👥 Usuários encontrados com esse login:`, usuariosComMesmoLogin.length);
        console.log("📋 Detalhes:", usuariosComMesmoLogin.map(u => ({
            id: u.id,
            nome: u.name,
            posto: u.posto,
            senhaCorreta: u.senhaPdv ? '***' : 'null'
        })));

        // Se não encontrou nenhum usuário
        if (usuariosComMesmoLogin.length === 0) {
            console.log("❌ Nenhum usuário encontrado com este login");
            return {
                encontrado: false,
                usuario: null,
                erro: 'Usuário não encontrado'
            };
        }

        // Buscar usuário com a senha correta
        const usuarioCorreto = usuariosComMesmoLogin.find(u => u.senhaPdv === senha);

        if (usuarioCorreto) {
            console.log("✅ Usuário encontrado com senha correta:", usuarioCorreto.name);
            const usuarioFormatado = {
                id: usuarioCorreto.id,
                nome: usuarioCorreto.name || usuarioCorreto.nome || "Desconhecido",
                posto: usuarioCorreto.posto || "default",
                senhaCorreta: usuarioCorreto.senhaPdv,
                email: usuarioCorreto.email || "",
                role: usuarioCorreto.role || "Funcionário",
                permissao: parseInt(usuarioCorreto.permissao) || 4,
                idLogin: usuarioCorreto.idLogin
            };

            return {
                encontrado: true,
                usuario: usuarioFormatado,
                erro: null
            };
        }

        // Se chegou aqui, significa que o login existe mas a senha está errada
        console.log("❌ Senha incorreta para o login");

        // Verificar se há múltiplos usuários com mesmo login para dar mensagem mais específica
        if (usuariosComMesmoLogin.length > 1) {
            const postosDisponiveis = [...new Set(usuariosComMesmoLogin.map(u => u.posto))];
            return {
                encontrado: false,
                usuario: null,
                erro: `Senha incorreta. Existem ${usuariosComMesmoLogin.length} usuários com este login nos postos: ${postosDisponiveis.join(', ')}`
            };
        }

        return {
            encontrado: false,
            usuario: null,
            erro: 'Senha PDV incorreta'
        };
    };

    // Função auxiliar para buscar apenas por idLogin (usada na aprovação)
    const buscarUsuarioPorIdLogin = (idLogin) => {
        const loginStr = idLogin.toString().trim();
        const usuariosComMesmoLogin = usuarios.filter(u =>
            u.idLogin?.toString().trim() === loginStr
        );

        if (usuariosComMesmoLogin.length === 0) {
            return {
                nome: "Desconhecido",
                posto: "default",
                senhaCorreta: null,
                email: "",
                role: "Funcionário",
                permissao: 4,
                idLogin: null
            };
        }

        // Retorna o primeiro usuário (para casos de aprovação)
        const primeiroUsuario = usuariosComMesmoLogin[0];
        return {
            id: primeiroUsuario.id,
            nome: primeiroUsuario.name || primeiroUsuario.nome || "Desconhecido",
            posto: primeiroUsuario.posto || "default",
            senhaCorreta: primeiroUsuario.senhaPdv,
            email: primeiroUsuario.email || "",
            role: primeiroUsuario.role || "Funcionário",
            permissao: parseInt(primeiroUsuario.permissao) || 4,
            idLogin: primeiroUsuario.idLogin
        };
    };

    const handleLogin = () => {
        try {
            if (!login || !senhaPdv) {
                setErro('Preencha login e senha');
                return;
            }

            setLoading(true);
            setErro('');

            // CORREÇÃO: Usar a nova função que valida login E senha
            const resultado = buscarUsuarioPorIdLoginESenha(login, senhaPdv);

            if (!resultado.encontrado) {
                setErro(resultado.erro);
                setLoading(false);
                return;
            }

            setUsuarioLogado(resultado.usuario);

            // Tentar capturar foto, mas permitir continuar sem câmera
            capturePhoto();
            setEnviar(true);

        } catch (error) {
            console.error("Erro no login:", error);
            setErro("Erro ao processar login. Tente novamente.");
            setLoading(false);
        }
    };

    // CORREÇÃO: Função de verificação de permissão para aprovador
    const verificarPermissaoAprovador = (idLogin, senha) => {
        const resultado = buscarUsuarioPorIdLoginESenha(idLogin, senha);

        if (!resultado.encontrado) {
            return { sucesso: false, erro: resultado.erro };
        }

        const usuario = resultado.usuario;

        if (usuario.permissao > 3) {
            return { sucesso: false, erro: 'Permissão insuficiente para aprovar pontos. Apenas gerentes e supervisores podem aprovar.' };
        }

        return { sucesso: true, usuario };
    };

    // Restante do código permanece igual...
    const startCamera = async () => {
        try {
            setCameraError('');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Erro ao acessar a câmera", error);
            setCameraError("Câmera indisponível. Você ainda pode bater ponto, mas será necessário aprovação.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const capturePhoto = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!video || !canvas) {
            console.warn("Câmera não disponível para captura");
            setFoto('sem_camera');
            return;
        }

        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const photo = canvas.toDataURL('image/jpeg', 0.7);
            setFoto(photo);
        } catch (error) {
            console.error("Erro ao capturar foto:", error);
            setFoto('sem_camera');
        }
    };

    const resetarFormulario = () => {
        setLogin('');
        setSenhaPdv('');
        setFoto(null);
        setErro('');
        setUsuarioLogado(null);
        setIsCameraActive(false);
        setTimeout(() => setIsCameraActive(true), 100);
    };

    const getColecaoPorPosto = (posto) => {
        const postoLower = posto.toLowerCase().trim();
        console.log(`🏪 Determinando coleção para posto: "${posto}" (${postoLower})`);

        if (postoLower.includes('colinas25')) {
            return 'pontoscolinas25';
        } else if (postoLower.includes('colinas')) {
            return 'pontoscolinas';
        } else {
            return 'pontos';
        }
    };

    const salvarNoFirestore = async (dadosPonto, postoUsuario) => {
        try {
            const colecao = getColecaoPorPosto(postoUsuario);
            console.log(`🎯 Salvando na coleção: ${colecao} para posto: ${postoUsuario}`);

            const pendenteStatus = dadosPonto.foto && dadosPonto.foto !== 'sem_camera'
                ? null
                : 'pendente_aprovacao';

            const dadosCompletos = {
                idLogin: dadosPonto.idLogin,
                senhaPdv: dadosPonto.senhaPdv,
                horaPonto: Timestamp.fromDate(new Date(dadosPonto.horaPonto)),
                foto: dadosPonto.foto,
                usuario: dadosPonto.usuario,
                posto: dadosPonto.posto,
                email: dadosPonto.email,
                role: dadosPonto.role,
                status: null,
                pendenteStatus: pendenteStatus,
                timestamp: Timestamp.now(),
                colecaoSalva: colecao,
                aprovador: null,
                dataAprovacao: null,
                motivoSemFoto: dadosPonto.motivoSemFoto || 'Câmera indisponível'
            };

            console.log(`💾 Dados completos para salvar em ${colecao}:`, {
                ...dadosCompletos,
                foto: dadosCompletos.foto ? `[BASE64_${dadosCompletos.foto?.length || 0}bytes]` : 'null'
            });

            const docRef = await addDoc(collection(db, colecao), dadosCompletos);

            console.log(`✅✅✅ Ponto SALVO COM SUCESSO!`);
            console.log(`📝 Coleção: ${colecao}`);
            console.log(`🆔 ID do documento: ${docRef.id}`);

            return {
                sucesso: true,
                id: docRef.id,
                status: null,
                pendenteStatus: pendenteStatus,
                colecao: colecao
            };
        } catch (error) {
            console.error(`❌❌❌ ERRO CRÍTICO ao salvar na coleção :`, error);
            throw error;
        }
    };

    const enviarRequisicao = async () => {
        try {
            // CORREÇÃO: Garantir que temos o usuário correto
            if (!usuarioLogado) {
                const resultado = buscarUsuarioPorIdLoginESenha(login, senhaPdv);
                if (!resultado.encontrado) {
                    setErro(resultado.erro);
                    setLoading(false);
                    return;
                }
                setUsuarioLogado(resultado.usuario);
            }

            const usuario = usuarioLogado;

            const payload = {
                idLogin: login.toString().trim(),
                senhaPdv: senhaPdv,
                horaPonto: new Date().toISOString(),
                foto: foto && foto !== 'sem_camera' ? foto.split(",")[1] : null,
                usuario: usuario.nome,
                posto: usuario.posto,
                email: usuario.email,
                role: usuario.role,
                motivoSemFoto: foto === 'sem_camera' ? 'Câmera indisponível' : null
            };

            console.log("🔄 Iniciando processo de salvamento...");
            console.log("👤 Usuário confirmado:", usuario);

            const resultadoFirestore = await salvarNoFirestore(payload, usuario.posto);
            console.log("🎉 RESULTADO FINAL DO FIREBASE:", resultadoFirestore);

            if (resultadoFirestore.pendenteStatus === null) {
                alert('✅ Ponto registrado com sucesso!');
            } else {
                alert('⚠️ Ponto registrado! Aguardando aprovação por gerente.');
            }

            resetarFormulario();

        } catch (error) {
            console.error("❌ Erro na requisição:", error);
            setErro('Erro ao registrar ponto: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Restante do código (useEffects, aprovação, etc) permanece igual...
    useEffect(() => {
        if (isCameraActive) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isCameraActive]);

    useEffect(() => {
        if (foto && enviar) {
            setEnviar(false);
            enviarRequisicao();
        }
    }, [foto, enviar]);

    // Monitorar pontos pendentes de aprovação
    useEffect(() => {
        const colecoes = ['pontos', 'pontoscolinas', 'pontoscolinas25'];
        const unsubscribes = [];

        console.log("🔍 Iniciando monitoramento das coleções:", colecoes);

        colecoes.forEach(colecao => {
            const q = query(
                collection(db, colecao),
                where('pendenteStatus', '==', 'pendente_aprovacao')
            );

            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    console.log(`📊 Snapshot recebido para ${colecao}:`, snapshot.docs.length, 'documentos');
                    const pontos = snapshot.docs.map(doc => ({
                        id: doc.id,
                        colecao: colecao,
                        ...doc.data()
                    }));

                    setPontosPendentes(prev => {
                        const filtered = prev.filter(p => p.colecao !== colecao);
                        return [...filtered, ...pontos];
                    });
                },
                (error) => {
                    console.error(`❌ Erro no snapshot de ${colecao}:`, error);
                }
            );

            unsubscribes.push(unsubscribe);
        });

        return () => {
            console.log("🧹 Limpando listeners...");
            unsubscribes.forEach(unsubscribe => unsubscribe());
        };
    }, []);

    const aprovarPonto = async (pontoId, colecao, aprovador) => {
        try {
            console.log(`✅ Aprovando ponto ${pontoId} na coleção ${colecao}`);
            const pontoRef = doc(db, colecao, pontoId);
            await updateDoc(pontoRef, {
                pendenteStatus: null,
                aprovador: aprovador.nome,
                idAprovador: aprovador.idLogin,
                dataAprovacao: Timestamp.now()
            });
            console.log(`✅ Ponto ${pontoId} aprovado com sucesso`);
            return true;
        } catch (error) {
            console.error("❌ Erro ao aprovar ponto:", error);
            throw error;
        }
    };

    const handleAprovarPonto = async () => {
        if (!loginAprovador || !senhaAprovador) {
            setErro('Digite o login e senha do aprovador');
            return;
        }

        setLoadingAprovacao(true);
        setErro('');

        try {
            const verificacao = verificarPermissaoAprovador(loginAprovador, senhaAprovador);

            if (!verificacao.sucesso) {
                setErro(verificacao.erro);
                setLoadingAprovacao(false);
                return;
            }

            await aprovarPonto(
                pontoSelecionado.id,
                pontoSelecionado.colecao,
                verificacao.usuario
            );

            alert('✅ Ponto aprovado com sucesso!');
            setDialogAprovacao(false);
            setPontoSelecionado(null);
            setLoginAprovador('');
            setSenhaAprovador('');
            resetarFormulario();

        } catch (error) {
            console.error('Erro ao aprovar ponto:', error);
            setErro('Erro ao aprovar ponto: ' + error.message);
        } finally {
            setLoadingAprovacao(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && login && senhaPdv && !loading) {
            handleLogin();
        }
    };

    const abrirDialogAprovacao = (ponto) => {
        setPontoSelecionado(ponto);
        setDialogAprovacao(true);
        setLoginAprovador('');
        setSenhaAprovador('');
    };

    return (
        <Container maxWidth="sm">
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" marginTop={4}
                 sx={{
                     backgroundColor: '#f5f5f5',
                     borderRadius: '10px',
                     padding: '30px',
                     boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                     width: '100%',
                 }}
            >
                <Typography variant="h4" gutterBottom sx={{ color: '#008080', textAlign: 'center' }}>
                    Grupo Colinas
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ color: '#333', textAlign: 'center', marginBottom: 3 }}>
                    Posto de Atendimento - Bater Ponto
                </Typography>

                {/* Status da Câmera */}
                <Box sx={{ mb: 2, width: '100%' }}>
                    {cameraError ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {cameraError}
                        </Alert>
                    ) : (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Câmera funcionando normalmente
                        </Alert>
                    )}
                </Box>

                {/* Foto Preview */}
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ marginBottom: 3 }}>
                    {foto && foto !== 'sem_camera' ? (
                        <img
                            src={foto}
                            alt="Foto do usuário"
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                marginBottom: 10,
                                border: '2px solid #008080'
                            }}
                        />
                    ) : foto === 'sem_camera' ? (
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#ff6b35', mb: 1 }}>
                                ⚠️ Sem câmera
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                                Ponto requer aprovação
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{ color: '#aaa', marginBottom: 2 }}>
                            Sua foto será capturada
                        </Typography>
                    )}
                </Box>

                {erro && (
                    <Alert severity="error" sx={{ marginBottom: 2, width: '100%' }}>
                        {erro}
                    </Alert>
                )}

                <TextField
                    label="Login"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: '#fff',
                            color: '#333',
                            borderRadius: '8px',
                        },
                        '& .MuiInputLabel-root': { color: '#008080' },
                    }}
                />

                <TextField
                    label="Senha PDV"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={senhaPdv}
                    onChange={(e) => setSenhaPdv(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': { backgroundColor: '#fff', color: '#333', borderRadius: '8px' },
                        '& .MuiInputLabel-root': { color: '#008080' },
                    }}
                />

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleLogin}
                    disabled={loading || !login || !senhaPdv}
                    sx={{
                        marginTop: 2,
                        padding: '12px',
                        backgroundColor: '#008080',
                        '&:hover': { backgroundColor: '#006f6f' },
                        borderRadius: '8px',
                        fontSize: '16px',
                    }}
                >
                    {loading ? (
                        <Box display="flex" alignItems="center">
                            <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                            Processando...
                        </Box>
                    ) : (
                        'Bater Ponto'
                    )}
                </Button>

                {/* Seção de Aprovação para Gerentes */}
                {pontosPendentes.length > 0 && (
                    <Box sx={{ mt: 4, width: '100%' }}>
                        <Typography variant="h6" sx={{ color: '#ff6b35', mb: 2 }}>
                            ⚠️ Pontos Pendentes de Aprovação: {pontosPendentes.length}
                        </Typography>
                        {pontosPendentes.slice(0, 3).map((ponto) => (
                            <Box key={`${ponto.colecao}-${ponto.id}`} sx={{
                                p: 2,
                                mb: 1,
                                border: '1px solid #ff6b35',
                                borderRadius: '8px',
                                backgroundColor: '#fffaf0'
                            }}>
                                <Typography variant="body2">
                                    <strong>{ponto.usuario}</strong> - {ponto.posto}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    {new Date(ponto.timestamp?.toDate()).toLocaleString()}
                                </Typography>
                                <Chip
                                    label="Sem foto"
                                    size="small"
                                    color="warning"
                                    sx={{ mt: 1 }}
                                />
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ mt: 1, ml: 1 }}
                                    onClick={() => abrirDialogAprovacao(ponto)}
                                >
                                    Aprovar
                                </Button>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Câmera */}
                {isCameraActive && !cameraError && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            width="100%"
                            style={{
                                borderRadius: '8px',
                                marginTop: 10,
                                marginBottom: 10,
                                maxHeight: '150px',
                                border: '2px solid #008080'
                            }}
                        />
                    </Box>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Box>

            {/* Dialog de Aprovação */}
            <Dialog open={dialogAprovacao} onClose={() => setDialogAprovacao(false)}>
                <DialogTitle>Aprovar Ponto sem Foto</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Aprovar ponto de <strong>{pontoSelecionado?.usuario}</strong>?
                    </Typography>

                    <TextField
                        label="Login do Aprovador"
                        fullWidth
                        value={loginAprovador}
                        onChange={(e) => setLoginAprovador(e.target.value)}
                        disabled={loadingAprovacao}
                        sx={{ mt: 1, mb: 2 }}
                    />

                    <TextField
                        label="Senha do Aprovador"
                        type="password"
                        fullWidth
                        value={senhaAprovador}
                        onChange={(e) => setSenhaAprovador(e.target.value)}
                        disabled={loadingAprovacao}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogAprovacao(false)} disabled={loadingAprovacao}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAprovarPonto}
                        disabled={loadingAprovacao || !loginAprovador || !senhaAprovador}
                        variant="contained"
                        color="primary"
                    >
                        {loadingAprovacao ? <CircularProgress size={20} /> : 'Aprovar Ponto'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Login;