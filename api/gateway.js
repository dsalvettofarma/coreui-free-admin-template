// Vercel Serverless Function - API Gateway
import { google } from 'googleapis';

// Google Sheets Configuration - Using the same SHEET_ID from Nova
const SHEET_ID = '1X7HJGFqGwQrqI8J_nOcV9c2XLqB7N3SWgOGm_rJ6VFk8';
const RANGE = 'Hoja1!A:F'; // documento, correo, nombre, comentarios, fecha, logueado

// Helper function to get Google Sheets service
function getGoogleSheetsService() {
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

// Get data from Google Sheets
async function getSheetData() {
  try {
    const sheets = getGoogleSheetsService();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw new Error('Error al obtener datos de Google Sheets');
  }
}

// Add data to Google Sheets
async function addToSheet(data) {
  try {
    const sheets = getGoogleSheetsService();
    const now = new Date();
    const fechaFormateada = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const values = [[
      data.documento || '',
      data.correo || '',
      data.nombre || '',
      data.comentarios || '',
      fechaFormateada,
      data.logueado || 'Sí'
    ]];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding to sheet:', error);
    throw new Error('Error al agregar datos a Google Sheets');
  }
}

// Main handler function
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { module, action } = req.query;
      
      if (module === 'fraudes' && action === 'list') {
        const data = await getSheetData();
        return res.status(200).json({
          success: true,
          data: data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Acción no válida'
        });
      }
    }
    
    if (req.method === 'POST') {
      const { module, action, ...formData } = req.body;
      
      if (module === 'fraudes' && action === 'add') {
        await addToSheet(formData);
        return res.status(200).json({
          success: true,
          message: 'Datos agregados correctamente'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Acción no válida'
        });
      }
    }
    
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
}