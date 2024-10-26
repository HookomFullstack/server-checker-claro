import puppeteer from 'puppeteer'
import axios from 'axios'
import proxyChain from 'proxy-chain'

export const checker = async({phones, io, i, indexingPhones}) => {
    const initBrowser = async() => {
        let proxyInfo = null
        do {
            const {data} = await axios('https://info.proxy.abcproxy.com/extractUnlimitedProxyIp?regions=SAU&num=1&protocol=http&return_type=txt&lh=1')
            proxyInfo = data
        } while (proxyInfo?.data != null)

        const proxy = await proxyChain.anonymizeProxy({url: `http://${proxyInfo}`, port: 3000})
        const browser = await puppeteer.launch({ headless: false,  
            args: [ `--proxy-server=${proxy}` ]
        })
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(0)
        page.setDefaultTimeout(0)
        await page.goto('https://portalpagos.claro.com.co/phrame.php?action=despliegue_personal&clase=vistasclaro&metodo=pantalla_inicio&empresa=claro#no-back-button')
        io.to(i).emit('[claro] exectMsg', `Instancia ${i} ejecutandose....`)
        await page.waitForSelector('h1')
        const ifAcessDenied = await page.$('h1')
        const acessDeniedText = await page.evaluate((e) => e?.innerText, ifAcessDenied)
        console.log(acessDeniedText != 'Portal de PAGOS Y RECARGAS')
        if(acessDeniedText != 'Portal de PAGOS Y RECARGAS' ) {
                console.log('entro')
                await browser.close()
                return { page: false, browser: false}
        }
        return { page, browser }
    }
    let page = false
    let browser = false
    do {
        const data = await initBrowser()
        page = data.page
        browser = data.browser
    } while (page == false)
        
    for (const phone of phones) {
        try {
            await page.waitForSelector('#select > div > h1')
            const start = new Date();
            const {price, status} = await page.evaluate(async (phone) => {
                const myHeaders = new Headers();
                const formdata = new FormData();
                formdata.append("FLUJOPAGOGW", "PFPHM");
                formdata.append("FLUJOPAGO", "10002");
                formdata.append("ex", "");
                formdata.append("paramLista", "");
                formdata.append("action", "despliegue_personal");
                formdata.append("campos_borrar", "CLACO_NUMERO");
                formdata.append("operacion", "Adicionar");
                formdata.append("url_modal", "");
                formdata.append("id_objeto", "10002");
                formdata.append("valor_llave", "");
                formdata.append("parametros_padre", "&ValorTotal=&SaldoParcial=&NumeroCelular=&FechaVencimiento=&FORMA_PAGO=&VALOR_PLAN=&VALOR_CUOTEQUIP=&FECHA_CARGADATOS=&CODIGO_CLIENTE=");
                formdata.append("mensaje_error", "Debe asignar a un responsable para la actividad a seguir");
                formdata.append("go", "");
                formdata.append("preguardar", "");
                formdata.append("confGuardaComo", "Seguro que desea duplicar este registro");
                formdata.append("modifi_detalle", "");
                formdata.append("nombre_campo", "");
                formdata.append("latitud", "");
                formdata.append("longitud", "");
                formdata.append("enviarForm", "");
                formdata.append("autoguardar", "");
                formdata.append("guion_encuesta", "");
                formdata.append("clase", "vistasclaro");
                formdata.append("metodo", "confirmacion");
                formdata.append("empresa", "claro");
                formdata.append("NumeroCelular", `${phone}`);
                formdata.append("CLACO_NUMERO", "");
                formdata.append("NRO_CUENTA", "");
                formdata.append("TIPO_TRANS", "");
                formdata.append("USRIO_NUMERO", "");
                formdata.append("IPTRANSACCION", "");
                formdata.append("TIPO_TRANS_ORIG", "");
                formdata.append("FECHA_INICIO", "2024-07-13 02:21");
                formdata.append("NumeroIdentificacion", "");
                formdata.append("CodigoCliente", "");
                formdata.append("IdentificacionDeudor", "");
                formdata.append("OrigenPago", "");
                formdata.append("mySubmit_", "Continuar");
        
                const requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: formdata,
                    redirect: "follow"
                };
        
                const response = await fetch("https://portalpagos.claro.com.co/phrame.php?id_objeto=100002", requestOptions);
        
                const price = await response.text();
                const parsePrice = price.split('\n')
                .filter(e => e.includes('ValorTotalEdit'))
                .map(e => e.split(/[<>]/g))
                .flat()
                .filter(e => e.includes('$'))[0]?.split(',')[0].replaceAll('$', '').replaceAll('.', '')
                console.log(parsePrice)
                return {price: parsePrice,
                    status: response.status
                };
            }, phone)
            console.log(price, status)
            if(status == 403) await page.reload()
            if(status == 403) {
                io.to(i).emit('[claro] exectMsg', `HA OCURRIDO UN ERROR CON LA INSTANCIA ${i} SE CERRARA AUTOMATICAMENTE`)
                throw('error 403 ')
            }
            const cookiesInDelete = await page.cookies('https://portalpagos.claro.com.co/index.php?view=vistas/personal/claro/newclaro/inicio.php&id_objeto=#no-back-button')
            cookiesInDelete.map(async({name}) => await page.deleteCookie({name}))
            const end = new Date();
            const time = end.getTime()-start.getTime()+'ms'
            if (price) {
                await io.to(i).emit(`[claro] live`, {price, time, index: indexingPhones.indexOf(phone), phone})
                continue
            }
            await io.to(i).emit(`[claro] dead`, {time, index: indexingPhones.indexOf(phone), phone})
        } catch (error) {
            await browser.close()
            do {
                const data = await initBrowser()
                page = data.page
                browser = data.browser
            } while (page == false);
            continue
        }
    }


}