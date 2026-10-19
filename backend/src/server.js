require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { openDb } = require('./db');
const { api, publicApi } = require('./api');
const { migrateCatalog } = require('./catalog-migration');

const app = express(); const db = openDb(); migrateCatalog(db);
app.use(express.json());
if (process.env.NODE_ENV !== 'production' && process.env.CORS_ORIGIN) app.use(cors({origin:process.env.CORS_ORIGIN}));
app.get('/health', (req,res)=> { try { db.prepare('SELECT 1').get();res.json({status:'ok',database:'accessible'}); } catch {res.status(503).json({status:'unavailable'});} });
app.use('/api/public', publicApi(db)); app.use('/api', api(db));
const dist=path.resolve(process.cwd(),'frontend/dist/essalud-demo/browser');
if(process.env.NODE_ENV==='production') { app.use(express.static(dist)); app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html'))); }
const port=Number(process.env.PORT||3000); app.listen(port,'0.0.0.0',()=>console.log(`Demo EsSalud disponible en ${port}`));
