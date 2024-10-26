import {createServer} from 'http'

import morgan from 'morgan';
import express  from 'express'
import cors  from 'cors'
import { Server } from 'socket.io'
import 'dotenv/config'

import { checker } from './scrap.mjs';

// routes
const app = express()

app.use(cors({origin: '*'}))
app.use(express.json({limit: '100mb'}))
app.use(morgan('common'))

const PORT = 3000

const httpServer = createServer(app)

export const io = new Server( httpServer, { cors: '*', maxHttpBufferSize: 1e10 } )

app.get('*', async(req ,res) => {
    res.json({ok: true})
})

io.on('connection', async(socket) => {    
    try {
        const instancias = socket.handshake?.query['instancias']
        const roomsInstancias = [...Array(Number(instancias))].map((e, i) => e=++i).map(async(id) => await socket.join(id))
        socket.on('[claro] postpago', async({phones, i, indexingPhones}) => {
            checker({ phones, io, i, indexingPhones })
        }
    )
    } catch (error) {
        console.log(error);
    }

})


// seed(1000)
// export const handler = serverless(httpServer)
httpServer.listen(PORT ?? 0, () => console.log(`conectado al servidor ${PORT}`) )
