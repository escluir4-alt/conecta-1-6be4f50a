import { createFileRoute, Navigate } from '@tanstack/react-router';

// Compatibilidade com links anteriores: a grade anual agora pertence a /receitas.
export const Route = createFileRoute('/contas-a-receber')({
  component: () => <Navigate to="/receitas" replace />,
});
