import { createFileRoute } from '@tanstack/react-router';
import { RevenueWorkspace } from '@/components/finance/RevenueWorkspace';

export const Route = createFileRoute('/contas-a-receber')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Contas a receber — Casa Clara' },
    { name: 'description', content: 'Grade anual das receitas por fonte e mês, com acompanhamento de recebimentos.' },
    { property: 'og:title', content: 'Contas a receber — Casa Clara' },
    { property: 'og:description', content: 'Acompanhe as receitas previstas e recebidas em cada mês do exercício.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => <RevenueWorkspace mode="annual" />,
});