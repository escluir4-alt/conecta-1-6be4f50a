import { describe,it,expect } from 'vitest';
import { pixRecipientSchema,pixMerchantText,savedRecipientSchema } from '@/lib/finance/pix-recipient';
import { makePix } from '@/lib/finance/invoice';
describe('Recebedor da fatura',()=>{
  const recipient={key:'financeiro@example.com',name:'Maria Aparecida da Conceição Silva',city:'São José do Rio Preto',state:'SP'};
  it('preserva nome completo além dos 25 caracteres do Pix',()=>expect(pixRecipientSchema.parse(recipient).name).toBe('Maria Aparecida da Conceição Silva'));
  it('preserva cidade completa no cadastro',()=>expect(savedRecipientSchema.parse(recipient).city).toBe('São José do Rio Preto'));
  it('rejeita estado inexistente',()=>expect(savedRecipientSchema.safeParse({...recipient,state:'XX'}).success).toBe(false));
  it('adapta apenas os campos do QR às regras Pix',()=>{expect(pixMerchantText(recipient.name,25)).toBe('MARIA APARECIDA DA CONCEI');expect(pixMerchantText(recipient.city,15)).toBe('SAO JOSE DO RIO');});
  it('gera Pix com nome e cidade longos sem alterar o cadastro',async()=>{const payload=await makePix(recipient.key,recipient.name,recipient.city,12345);expect(payload).toContain('5406123.45');expect(payload).toContain('MARIA APARECIDA');expect(recipient.name).toBe('Maria Aparecida da Conceição Silva');});
});