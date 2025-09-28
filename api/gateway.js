// Vercel Serverless Function - API Gateway
import gatewayHandler from '../modulos/api/gateway.js';

export default async function handler(req, res) {
  return await gatewayHandler(req, res);
}