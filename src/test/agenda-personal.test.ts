import { describe, expect, it } from 'vitest';
import { occursOn, personalOccurrences, reminderOffsets, type PersonalRecord } from '@/lib/finance/agenda-personal';
const record: PersonalRecord = {id:'one',kind:'appointment',title:'Consulta',start_date:'2026-11-17',time:'08:00',description:'',recurrence:'none',favorite:false,reminder:true,items:[]};
describe('Agenda pessoal', () => {
  it('estrela ativa lembretes 15, 7, 3, 1 dias e no próprio dia', () => {expect(reminderOffsets(true,true)).toEqual([15,7,3,1,0]);});
  it('sem estrela lembra apenas no próprio dia', () => {expect(reminderOffsets(false,true)).toEqual([0]);});
  it('lembrete desativado não gera antecedências', () => {expect(reminderOffsets(true,false)).toEqual([]);});
  it('12x36 gera plantões a cada 48 horas', () => {expect(personalOccurrences('2026-11',[{...record,kind:'work',recurrence:'12x36',reminder:false}]).map(i => i.date)).toEqual(['2026-11-17','2026-11-19','2026-11-21','2026-11-23','2026-11-25','2026-11-27','2026-11-29']);});
  it('não gera plantão antes da data inicial', () => {expect(occursOn({...record,recurrence:'12x36'},'2026-11-15')).toBe(false);});
  it('aniversário repete anualmente', () => {expect(occursOn({...record,kind:'birthday',recurrence:'yearly'},'2027-11-17')).toBe(true);expect(occursOn({...record,kind:'birthday',recurrence:'yearly'},'2027-11-18')).toBe(false);});
  it('periodicidade mensal limita dia ao final de fevereiro', () => {expect(occursOn({...record,start_date:'2026-01-31',recurrence:'monthly'},'2026-02-28')).toBe(true);});
  it('favorito gera todas as datas de antecedência', () => {expect(personalOccurrences('2026-11',[{...record,favorite:true}]).map(i => i.date)).toEqual(['2026-11-02','2026-11-10','2026-11-14','2026-11-16','2026-11-17']);});
});