import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { TextField, Button, Container, Typography, Box, Alert } from '@mui/material';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const Login = () => {
    const [login, setLogin] = useState('');
    const [senhaPdv, setSenhaPdv] = useState('');
    const [foto, setFoto] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(true);
    const [erro, setErro] = useState('');
    const [enviar, setEnviar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [usuarios, setUsuarios] = useState([]);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const lista = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsuarios(lista);
            } catch (error) {
                console.error("Erro ao buscar lista de usuários:", error);
            }
        };
        fetchUsuarios();
    }, []);

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

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Erro ao acessar a câmera", error);
            setErro("Não foi possível acessar a câmera");
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/png');
        setFoto(photo);
    };

    const resetarFormulario = () => {
        setLogin('');
        setSenhaPdv('');
        setFoto(null);
        setErro('');
        setIsCameraActive(false);
        setTimeout(() => setIsCameraActive(true), 100);
    };

    const handleLogin = () => {
        try {
            setLoading(true);
            setErro('');
            capturePhoto();
            setEnviar(true);
        } catch (error) {
            console.error("Erro ao capturar a foto:", error);
            setErro("Erro ao capturar a foto. Tente novamente.");
            setLoading(false);
        }
    };

    const buscarUsuarioPorIdLogin = (idLogin) => {
        const loginStr = idLogin.toString().trim();
        const usuario = usuarios.find(u =>
            u.idLogin?.toString().trim() === loginStr ||
            u.id?.toString().trim() === loginStr
        );
        return usuario ? usuario.name || usuario.nome || "Desconhecido" : "Desconhecido";
    };

    const enviarRequisicao = async () => {
        try {
            const nomeUsuario = buscarUsuarioPorIdLogin(login);

            // Verificar se o usuário existe
            const usuarioExiste = usuarios.some(u =>
                u.idLogin?.toString().trim() === login.toString().trim() ||
                u.id?.toString().trim() === login.toString().trim()
            );

            if (!usuarioExiste) {
                setErro('Usuário não encontrado');
                setLoading(false);
                return;
            }

            const payload = {
                idLogin: login.toString().trim(),
                senhaPdv: senhaPdv,
                horaPonto: new Date().toISOString(), // Envia como string ISO
                foto: foto.split(",")[1],
                usuario: nomeUsuario
            };

            console.log("Enviando payload:", payload);

            const response = await axios.post('https://18.230.5.22/api/login', payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            if (response.data.sucesso) {
                alert('Ponto registrado com sucesso!');
                resetarFormulario();
            } else {
                setErro(response.data.mensagem || 'Erro desconhecido');
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            if (error.response) {
                setErro(error.response.data?.mensagem || `Erro ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                setErro('Não foi possível conectar ao servidor. Verifique a conexão.');
            } else {
                setErro('Erro ao tentar bater o ponto: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" marginTop={8}
                 sx={{
                     backgroundColor: '#f5f5f5',
                     borderRadius: '10px',
                     padding: '40px',
                     boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                     width: '100%',
                 }}
            >
                <Typography variant="h4" gutterBottom sx={{ color: '#008080', textAlign: 'center' }}>
                    Grupo Colinas
                </Typography>
                <Typography variant="h6" gutterBottom sx={{ color: '#333', textAlign: 'center', marginBottom: 4 }}>
                    Posto de Atendimento - Bater Ponto
                </Typography>

                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ marginBottom: 4 }}>
                    {foto ? (
                        <img
                            src={foto}
                            alt="Foto do usuário"
                            style={{
                                width: '70px',
                                height: '70px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                marginBottom: 10,
                                border: '2px solid #008080'
                            }}
                        />
                    ) : (
                        <Typography variant="body2" sx={{ color: '#aaa', marginBottom: 10 }}>Sua foto</Typography>
                    )}
                </Box>

                {erro && <Alert severity="error" sx={{ marginBottom: 2, width: '100%' }}>{erro}</Alert>}

                <TextField
                    label="Login"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: '#fff',
                            color: '#333',
                            borderRadius: '8px',
                        },
                        '& .MuiInputLabel-root': { color: '#008080' },
                        '& .MuiInputBase-input': { fontSize: '14px' },
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
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': { backgroundColor: '#fff', color: '#333', borderRadius: '8px' },
                        '& .MuiInputLabel-root': { color: '#008080' },
                        '& .MuiInputBase-input': { fontSize: '14px' },
                    }}
                />

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleLogin}
                    disabled={loading || !login || !senhaPdv}
                    sx={{
                        marginTop: 3,
                        padding: '10px',
                        backgroundColor: '#008080',
                        '&:hover': { backgroundColor: '#006f6f' },
                        borderRadius: '8px',
                        fontSize: '14px',
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? 'Enviando...' : 'Bater Ponto'}
                </Button>

                {isCameraActive && (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        width="100%"
                        style={{ borderRadius: '8px', marginTop: 10, marginBottom: 10, maxHeight: '200px' }}
                    />
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </Box>
        </Container>
    );
};

export default Login;