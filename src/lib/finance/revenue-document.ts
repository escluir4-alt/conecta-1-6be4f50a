export function printRevenueDocument(text: string, signature: string | null) {
  const page = window.open('', '_blank');
  if (!page) throw new Error('Permita abrir uma nova janela para imprimir.');
  page.document.title = 'Documento de Receitas — Axion';
  const heading = page.document.createElement('h1');
  heading.textContent = 'Axion — Receitas';
  const content = page.document.createElement('pre');
  content.textContent = text;
  content.style.whiteSpace = 'pre-wrap';
  content.style.fontFamily = 'sans-serif';
  page.document.body.append(heading, content);
  if (signature) {
    const image = page.document.createElement('img');
    image.alt = 'Assinatura'; image.src = signature; image.height = 80;
    image.onload = () => page.print();
    page.document.body.append(image);
  } else page.print();
}