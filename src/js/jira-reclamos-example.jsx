/**
 * Ejemplo de componente React para consultar reclamos de Jira
 * de forma segura usando el endpoint proxy
 * 
 * Este componente demuestra:
 * - Consulta segura sin exponer credenciales
 * - Manejo de estados de carga y error
 * - Renderizado del resumen de reclamos
 */

import React, { useState, useEffect } from 'react';

/**
 * Hook personalizado para consultar reclamos de Jira
 * 
 * @param {Object} params - Parámetros de consulta
 * @returns {Object} Estado de la consulta { data, loading, error, refetch }
 */
function useJiraReclamos(params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchReclamos = async (customParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Determinar si usar GET (con query params) o POST (con JQL custom)
      const finalParams = { ...params, ...customParams };
      
      let url = '/api/jira-reclamos';
      let options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Si hay JQL personalizado, usar POST
      if (finalParams.jql) {
        options.method = 'POST';
        options.body = JSON.stringify({
          jql: finalParams.jql,
          maxResults: finalParams.maxResults || 1
        });
      } else {
        // Construir query string para GET
        const queryParams = new URLSearchParams();
        
        if (finalParams.proyecto) queryParams.append('proyecto', finalParams.proyecto);
        if (finalParams.tipoIssue) queryParams.append('tipoIssue', finalParams.tipoIssue);
        if (finalParams.canal) queryParams.append('canal', finalParams.canal);
        if (finalParams.categoria) queryParams.append('categoria', finalParams.categoria);
        if (finalParams.fechaDesde) queryParams.append('fechaDesde', finalParams.fechaDesde);
        if (finalParams.fechaHasta) queryParams.append('fechaHasta', finalParams.fechaHasta);
        if (finalParams.limit) queryParams.append('limit', finalParams.limit);
        
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      return result;
      
    } catch (err) {
      console.error('Error al consultar reclamos:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    data,
    loading,
    error,
    refetch: fetchReclamos
  };
}

/**
 * Componente para mostrar el resumen de un reclamo
 */
function ResumenReclamo({ resumen }) {
  if (!resumen) return null;
  
  return (
    <div className="reclamo-card" style={styles.card}>
      <div className="reclamo-header" style={styles.header}>
        <h3 style={styles.title}>{resumen.titulo}</h3>
        <span className="reclamo-id" style={styles.id}>{resumen.id}</span>
      </div>
      
      <div className="reclamo-body" style={styles.body}>
        <div className="reclamo-section">
          <h4 style={styles.sectionTitle}>Cliente</h4>
          <p><strong>Nombre:</strong> {resumen.cliente.nombre}</p>
          <p><strong>Email:</strong> {resumen.cliente.email || 'No disponible'}</p>
        </div>
        
        <div className="reclamo-section">
          <h4 style={styles.sectionTitle}>Detalles</h4>
          <p><strong>Estado:</strong> <span style={styles.badge}>{resumen.estado}</span></p>
          <p><strong>Responsable:</strong> {resumen.responsable}</p>
          <p><strong>Canal:</strong> {resumen.canal || 'No especificado'}</p>
          <p><strong>Categoría:</strong> {resumen.categoria || 'No especificada'}</p>
        </div>
        
        <div className="reclamo-section">
          <h4 style={styles.sectionTitle}>Fechas</h4>
          <p><strong>Creación:</strong> {new Date(resumen.fechaCreacion).toLocaleString('es-AR')}</p>
          <p><strong>Última actualización:</strong> {new Date(resumen.ultimaActualizacion).toLocaleString('es-AR')}</p>
        </div>
        
        {resumen.descripcion && (
          <div className="reclamo-section">
            <h4 style={styles.sectionTitle}>Descripción</h4>
            <p style={styles.description}>{resumen.descripcion}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente principal de ejemplo
 */
function JiraReclamosExample() {
  // Usar el hook con parámetros por defecto
  const { data, loading, error, refetch } = useJiraReclamos({
    proyecto: 'SEO',
    tipoIssue: 'Reclamos',
    canal: 'Web,APP,WEB',
    categoria: 'Navegación',
    fechaDesde: '2025-10-06',
    fechaHasta: '2025-10-13',
    limit: '1'
  });
  
  // Estado para parámetros personalizados
  const [customParams, setCustomParams] = useState({
    fechaDesde: '2025-10-06',
    fechaHasta: '2025-10-13'
  });
  
  // Cargar datos al montar el componente
  useEffect(() => {
    refetch();
  }, []);
  
  // Manejar cambios en los inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomParams(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Consultar con parámetros personalizados
  const handleCustomQuery = () => {
    refetch(customParams);
  };
  
  return (
    <div className="jira-reclamos-container" style={styles.container}>
      <h2>Consultar Reclamos de Jira</h2>
      
      {/* Formulario de consulta */}
      <div className="query-form" style={styles.form}>
        <div style={styles.formGroup}>
          <label>Fecha Desde:</label>
          <input
            type="date"
            name="fechaDesde"
            value={customParams.fechaDesde}
            onChange={handleInputChange}
            style={styles.input}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label>Fecha Hasta:</label>
          <input
            type="date"
            name="fechaHasta"
            value={customParams.fechaHasta}
            onChange={handleInputChange}
            style={styles.input}
          />
        </div>
        
        <button
          onClick={handleCustomQuery}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Consultando...' : 'Buscar Reclamos'}
        </button>
      </div>
      
      {/* Estados de carga y error */}
      {loading && (
        <div style={styles.loading}>
          <p>Cargando reclamos...</p>
        </div>
      )}
      
      {error && (
        <div style={styles.error}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      {/* Resultados */}
      {data && data.resumen && !loading && (
        <ResumenReclamo resumen={data.resumen} />
      )}
      
      {data && !data.resumen && !loading && (
        <div style={styles.noData}>
          <p>No se encontraron reclamos para los criterios especificados.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Ejemplo avanzado: Consulta con JQL personalizado
 */
function JiraReclamosJQLExample() {
  const [jqlQuery, setJqlQuery] = useState(
    'project = SEO AND issuetype = "Reclamos" AND created >= "2025-10-06" ORDER BY created DESC'
  );
  const [maxResults, setMaxResults] = useState(5);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleJQLQuery = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/jira-reclamos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql: jqlQuery,
          maxResults: maxResults
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="jira-jql-container" style={styles.container}>
      <h2>Consulta JQL Personalizada</h2>
      
      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label>JQL Query:</label>
          <textarea
            value={jqlQuery}
            onChange={(e) => setJqlQuery(e.target.value)}
            rows={4}
            style={{ ...styles.input, width: '100%', fontFamily: 'monospace' }}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label>Máximo de resultados:</label>
          <input
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
            min="1"
            max="100"
            style={styles.input}
          />
        </div>
        
        <button
          onClick={handleJQLQuery}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Consultando...' : 'Ejecutar Query'}
        </button>
      </div>
      
      {error && (
        <div style={styles.error}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      
      {results && results.reclamos && (
        <div>
          <h3>Resultados: {results.resultados} de {results.total}</h3>
          {results.reclamos.map((reclamo, index) => (
            <ResumenReclamo key={reclamo.id || index} resumen={reclamo} />
          ))}
        </div>
      )}
      
      {results && results.resumen && (
        <ResumenReclamo resumen={results.resumen} />
      )}
    </div>
  );
}

// Estilos básicos
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  form: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  header: {
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#333'
  },
  id: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  body: {
    fontSize: '14px',
    lineHeight: '1.6'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '15px',
    marginBottom: '10px',
    color: '#555'
  },
  badge: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  description: {
    backgroundColor: '#f9f9f9',
    padding: '10px',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    fontSize: '13px'
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#666'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    color: '#856404'
  }
};

// Exportar componentes
export default JiraReclamosExample;
export { JiraReclamosJQLExample, useJiraReclamos, ResumenReclamo };
