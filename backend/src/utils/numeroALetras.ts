
export function numeroALetras(num: number): string {
    if (num === 0) return "CERO";
    
    const unidades = ["", "UN ", "DOS ", "TRES ", "CUATRO ", "CINCO ", "SEIS ", "SIETE ", "OCHO ", "NUEVE "];
    const decenas = ["DIEZ ", "ONCE ", "DOCE ", "TRECE ", "CATORCE ", "QUINCE ", "DIECISEIS ", "DIECISIETE ", "DIECIOCHO ", "DIECINUEVE ", "VEINTE ", "TREINTA ", "CUARENTA ", "CINCUENTA ", "SESENTA ", "SETENTA ", "OCHENTA ", "NOVENTA "];
    const centenas = ["", "CIENTO ", "DOSCIENTOS ", "TRESCIENTOS ", "CUATROCIENTOS ", "QUINIENTOS ", "SEISCIENTOS ", "SETECIENTOS ", "OCHOCIENTOS ", "NOVECIENTOS "];

    function getUnidades(n: number): string {
        return unidades[n];
    }

    function getDecenas(n: number): string {
        if (n < 10) return getUnidades(n);
        if (n >= 10 && n < 20) return decenas[n - 10];
        if (n >= 20 && n < 30) return "VEINTI" + getUnidades(n - 20);
        
        const u = n % 10;
        const d = Math.floor(n / 10);
        
        if (u === 0) return decenas[d + 8]; // Index adjustment for 20, 30...
        return decenas[d + 8].trim() + " Y " + getUnidades(u);
    }
    
    // Fix for decenas array mapping which is a bit custom above
    function getDecenasFixed(n: number): string {
        if (n < 10) return getUnidades(n);
        if (n >= 10 && n < 20) return decenas[n - 10]; // 10-19
        
        const d = Math.floor(n / 10);
        const u = n % 10;
        
        if (n === 20) return "VEINTE ";
        if (n < 30) return "VEINTI" + getUnidades(u);
        
        const tensText = ["", "", "VEINTE", "TREINTA ", "CUARENTA ", "CINCUENTA ", "SESENTA ", "SETENTA ", "OCHENTA ", "NOVENTA "];
        if (u === 0) return tensText[d];
        return tensText[d].trim() + " Y " + getUnidades(u);
    }

    function getCentenas(n: number): string {
        if (n === 100) return "CIEN ";
        if (n < 100) return getDecenasFixed(n);
        
        const c = Math.floor(n / 100);
        const r = n % 100;
        
        return centenas[c] + getDecenasFixed(r);
    }

    function getMiles(n: number): string {
        if (n < 1000) return getCentenas(n);
        
        const m = Math.floor(n / 1000);
        const r = n % 1000;
        
        if (m === 1) return "MIL " + getCentenas(r);
        return getCentenas(m) + "MIL " + getCentenas(r);
    }

    function getMillones(n: number): string {
        if (n < 1000000) return getMiles(n);
        
        const m = Math.floor(n / 1000000);
        const r = n % 1000000;
        
        if (m === 1) return "UN MILLON " + getMiles(r);
        return getMiles(m) + "MILLONES " + getMiles(r);
    }

    return getMillones(num).trim();
}
