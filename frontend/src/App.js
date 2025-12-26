import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import ValidarPontos from "./pages/usuarios/ValidarPontos";
import LoginAdm from "./pages/login/LoginAdm";
import HomePage from "./pages/login/HomeScreen";
import ListaUsuarios from "./pages/usuarios/ListaUsuarios";
import RelatorioAbonos from "./relatorios/RelatorioAbonos";
import RelatorioFaltas from "./relatorios/RelatorioFaltas";
import RelatorioPontos from "./relatorios/RelatorioPontos";
import PlanilhaMensal from "./pages/Planilha/PlanilhaMensal";
import ControleFinanceiro from "./pages/financeiro/ControleFinanceiro";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ValidarPontos />} />
                <Route path="/validar-pontos" element={<ValidarPontos />} />
                <Route path="/login" element={<LoginAdm />} />
                <Route path="/baterPonto" element={<Login />} />
                <Route path="/lista-usuarios" element={<ListaUsuarios />} />
                <Route path="/cadastro-usuarios" element={<ListaUsuarios modalCadastro={true} />} />
                <Route path="/relatorio-abonos" element={<RelatorioAbonos />} />
                <Route path="/relatorio-faltas" element={<RelatorioFaltas />} />
                <Route path="/relatorio-pontos" element={<RelatorioPontos />} />
                <Route path="/planilha-mensal" element={<PlanilhaMensal />} />
                <Route path="/controle-financeiro" element={<ControleFinanceiro />} />
            </Routes>
        </Router>
    );
}

export default App;
