import { describe, expect, it } from "vitest";
import { calculateCreditorAnnualColumn } from "@/lib/finance/annual-column";

const row = (amounts: Array<number | null>) =>
  amounts.map((expectedCents,i)=>({month:i+1,expectedCents}));
const paid = (paidCents:number,isSettled:boolean|null=true) => ({
  paidCents,isSettled,paidDate:"2026-11-14",
});

describe("Total anual — exercício em andamento",()=>{
  it("soma apenas o saldo das competências ainda pendentes, sem incluir meses verdes",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:false, months:row([10000,20000,30000,null]),
      payments:{1:paid(10000),3:paid(30000)},
    });
    expect(r).toMatchObject({
      mode:"remaining",amountCents:20000,outstandingCents:20000,
      paidCents:40000,hasPending:true,
    });
    expect(r.months.map(m=>m.status)).toEqual(["paid","pending","paid","empty"]);
  });

  it("ao quitar todas as competências, troca o total da linha pelo efetivamente pago",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:false, months:row([10000,20000]),
      payments:{1:paid(9000,true),2:paid(22000,true)},
    });
    expect(r).toMatchObject({
      mode:"paid",amountCents:31000,paidCents:31000,outstandingCents:0,hasPending:false,
    });
    expect(r.months.map(m=>m.status)).toEqual(["paid","paid"]);
  });

  it("pagamento parcial sem quitação não pinta verde e mantém o saldo remanescente",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:false, months:row([10000,20000]),
      payments:{1:paid(4000,false)},
    });
    expect(r).toMatchObject({mode:"remaining",amountCents:26000,paidCents:0,outstandingCents:26000});
    expect(r.months[0]).toMatchObject({
      paidCents:4000,remainingCents:6000,status:"pending",
    });
  });

  it("pagamento integral com status legado é verde, sem exigir novo registro",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:false, months:row([10000]),
      payments:{1:paid(10000,null)},
    });
    expect(r).toMatchObject({mode:"paid",amountCents:10000});
    expect(r.months[0]?.status).toBe("paid");
  });
});

describe("Total anual — exercício encerrado",()=>{
  it("soma apenas pagamentos de competências quitadas; marca pendentes em vermelho",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:true, months:row([10000,20000,30000]),
      payments:{1:paid(9500,true),2:paid(5000,false)},
    });
    expect(r).toMatchObject({
      mode:"paid",amountCents:9500,paidCents:9500,
      outstandingCents:35000,hasPending:true,
    });
    expect(r.months.map(m=>m.status)).toEqual(["paid","pending","pending"]);
  });
  it("descontos confirmados e acréscimos contam como dinheiro efetivamente pago",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:true, months:row([12000,15000]),
      payments:{1:paid(10000,true),2:paid(17000,true)},
    });
    expect(r.amountCents).toBe(27000);
    expect(r.months.map(m=>m.status)).toEqual(["paid","paid"]);
  });
  it("células sem valor cadastrado não são inventadas nem pintadas",()=>{
    const r=calculateCreditorAnnualColumn({
      closed:true, months:row([null,0]),
      payments:{},
    });
    expect(r).toMatchObject({amountCents:0,hasPending:false});
    expect(r.months.map(m=>m.status)).toEqual(["empty","empty"]);
  });
  it("não permite que uma mesma competência seja contada duas vezes",()=>{
    expect(()=>calculateCreditorAnnualColumn({
      closed:false,months:[{month:1,expectedCents:10000},{month:1,expectedCents:10000}],
      payments:{},
    })).toThrow(/duplicada/);
  });
});
