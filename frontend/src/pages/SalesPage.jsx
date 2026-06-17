import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, X, RotateCcw, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaginaVentas() {
  const [ventas, setVentas]               = useState([]);
  const [articulos, setArticulos]         = useState([]);
  const [cargando, setCargando]           = useState(true);
  const [modalAbierto, setModalAbierto]   = useState(false);
  const [formulario, setFormulario]       = useState({ idArticulo: '', cantidad: 1 });
  const [erroresForm, setErroresForm]     = useState({});
  const [fechaInicio, setFechaInicio]     = useState('');
  const [fechaFin, setFechaFin]           = useState('');
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [modalReclamo, setModalReclamo]   = useState(null);
  const [motivoReclamo, setMotivoReclamo] = useState('');
  const [busquedaArticulo, setBusquedaArticulo] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const parametros = new URLSearchParams();
      if (fechaInicio) parametros.append('startDate', fechaInicio);
      if (fechaFin)    parametros.append('endDate', fechaFin);
      const [resVentas, resArticulos] = await Promise.all([
        api.get('/sales?' + parametros),
        api.get('/articles'),
      ]);
      setVentas(resVentas.data);
      setArticulos(resArticulos.data.filter((a) => a.stock > 0 && a.status !== 'agotado'));
    } catch { toast.error('Error al cargar ventas'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [fechaInicio, fechaFin]);

  const ingresoTotal = ventas.filter(v => v.status === 'activa').reduce((suma, v) => suma + +v.total, 0);

  const manejarCambioArticulo = (articulo) => {
    setFormulario((anterior) => ({ ...anterior, idArticulo: articulo.id, cantidad: 1 }));
    setArticuloSeleccionado(articulo);
    setBusquedaArticulo('');
    setErroresForm((anterior) => ({ ...anterior, idArticulo: undefined }));
  };

  const articulosFiltrados = busquedaArticulo.trim()
    ? articulos.filter((a) => a.name.toLowerCase().includes(busquedaArticulo.toLowerCase())).slice(0, 8)
    : [];

  const validar = () => {
    const e = {};
    if (!formulario.idArticulo)       e.idArticulo = 'Selecciona un artículo';
    if (!formulario.cantidad || +formulario.cantidad < 1) e.cantidad = 'La cantidad debe ser al menos 1';
    if (articuloSeleccionado && +formulario.cantidad > articuloSeleccionado.stock)
      e.cantidad = `Stock disponible: ${articuloSeleccionado.stock}`;
    return e;
  };

  const registrarVenta = async () => {
    const errores = validar();
    if (Object.keys(errores).length) { setErroresForm(errores); return; }
    try {
      await api.post('/sales', { articleId: +formulario.idArticulo, quantity: +formulario.cantidad });
      toast.success('Venta registrada');
      setModalAbierto(false);
      setFormulario({ idArticulo: '', cantidad: 1 });
      setArticuloSeleccionado(null);
      setBusquedaArticulo('');
      cargar();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al registrar venta'); }
  };

  const anularVenta = async (id) => {
    if (!confirm('¿Anular esta venta? Se devolverá el stock al inventario.')) return;
    try {
      await api.put(`/sales/${id}/anular`);
      toast.success('Venta anulada');
      cargar();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al anular venta'); }
  };

  const registrarDevolucion = async (id) => {
    if (!confirm('¿Registrar devolución? Se devolverá el stock al inventario.')) return;
    try {
      await api.put(`/sales/${id}/devolucion`);
      toast.success('Devolución registrada');
      cargar();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al registrar devolución'); }
  };

  const enviarReclamo = async () => {
    if (!motivoReclamo.trim()) { toast.error('El motivo es requerido'); return; }
    try {
      await api.put(`/sales/${modalReclamo}/reclamo`, { motivo: motivoReclamo });
      toast.success('Reclamo registrado');
      setModalReclamo(null);
      setMotivoReclamo('');
      cargar();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al registrar reclamo'); }
  };

  const actualizarCampo = (campo) => (e) => {
    setFormulario((anterior) => ({ ...anterior, [campo]: e.target.value }));
    setErroresForm((anterior) => ({ ...anterior, [campo]: undefined }));
  };

  const colorEstado = (estado) => {
    if (estado === 'activa') return 'var(--success)';
    if (estado === 'anulada') return 'var(--danger)';
    if (estado === 'devuelta') return 'var(--warning)';
    return 'var(--tan)';
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro y seguimiento de ventas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModalAbierto(true); setFormulario({ idArticulo: '', cantidad: 1 }); setArticuloSeleccionado(null); setBusquedaArticulo(''); setErroresForm({}); }}>
          <Plus size={16} /> Registrar venta
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total de ventas</div>
          <div className="stat-value">{ventas.filter(v => v.status === 'activa').length}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#27ae60' }}>
          <div className="stat-label">Ingresos totales</div>
          <div className="stat-value" style={{ color: '#27ae60' }}>${ingresoTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--espresso)' }}>Desde</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--espresso)' }}>Hasta</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
        {(fechaInicio || fechaFin) && (
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setFechaInicio(''); setFechaFin(''); }}>
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      <div className="card table-wrapper">
        {cargando ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--tan)' }}>Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="empty-state"><p>No hay ventas registradas</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Artículo</th><th>Tipo</th>
                <th>Cantidad</th><th>P. Unit.</th><th>Total</th>
                <th>Vendedor</th><th>Fecha</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id}>
                  <td style={{ color: 'var(--tan)', fontSize: 13 }}>{venta.id}</td>
                  <td style={{ fontWeight: 600 }}>{venta.article?.name}</td>
                  <td>{venta.article?.articleType?.name}</td>
                  <td style={{ textAlign: 'center' }}>{venta.quantity}</td>
                  <td>${(+venta.unit_price).toFixed(2)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--brown)' }}>${(+venta.total).toFixed(2)}</td>
                  <td>{venta.user?.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--tan)' }}>
                    {new Date(venta.sale_date).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: 11, 
                      fontWeight: 600,
                      background: colorEstado(venta.status) + '20',
                      color: colorEstado(venta.status)
                    }}>
                      {venta.status}
                    </span>
                  </td>
                  <td>
                    {venta.status === 'activa' && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-danger" onClick={() => anularVenta(venta.id)} title="Anular venta">
                          <X size={12} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => registrarDevolucion(venta.id)} title="Devolución">
                          <RefreshCw size={12} />
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => { setModalReclamo(venta.id); setMotivoReclamo(''); }} title="Reclamo">
                          <AlertTriangle size={12} />
                        </button>
                      </div>
                    )}
                    {venta.motivo_reclamo && (
                      <span style={{ fontSize: 10, color: 'var(--danger)', display: 'block', marginTop: 4 }} title={venta.motivo_reclamo}>
                        Con reclamo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <div className="modal-backdrop" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar venta</h2>
              <button className="modal-close" onClick={() => setModalAbierto(false)}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label>Artículo *</label>
              {articuloSeleccionado ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{articuloSeleccionado.name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--tan)' }}>Stock: {articuloSeleccionado.stock} · ${(+articuloSeleccionado.price).toFixed(2)}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => { setArticuloSeleccionado(null); setFormulario((a) => ({ ...a, idArticulo: '' })); }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tan)' }} />
                  <input
                    placeholder="Buscar artículo por nombre..."
                    value={busquedaArticulo}
                    onChange={(e) => setBusquedaArticulo(e.target.value)}
                    style={{ paddingLeft: 32 }}
                    autoFocus
                  />
                  {busquedaArticulo.trim() && articulosFiltrados.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--sand)', borderRadius: 'var(--radius-sm)', marginTop: 4, maxHeight: 240, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {articulosFiltrados.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => manejarCambioArticulo(a)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0ebe6', fontSize: 14 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={{ fontWeight: 600 }}>{a.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--tan)' }}>Stock: {a.stock} · ${(+a.price).toFixed(2)} · {a.articleType?.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {busquedaArticulo.trim() && articulosFiltrados.length === 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--sand)', borderRadius: 'var(--radius-sm)', marginTop: 4, padding: '12px 14px', fontSize: 13, color: 'var(--tan)', zIndex: 10 }}>
                      No se encontraron artículos
                    </div>
                  )}
                </div>
              )}
              {erroresForm.idArticulo && <span className="error">{erroresForm.idArticulo}</span>}
            </div>
            <div className="form-group">
              <label>Cantidad *</label>
              <input type="number" min="1" max={articuloSeleccionado?.stock || 9999} value={formulario.cantidad} onChange={actualizarCampo('cantidad')} />
              {erroresForm.cantidad && <span className="error">{erroresForm.cantidad}</span>}
            </div>
            {articuloSeleccionado && formulario.cantidad > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0faf4', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
                Total estimado: <strong style={{ color: 'var(--success)' }}>${(+articuloSeleccionado.price * +formulario.cantidad).toFixed(2)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={registrarVenta}>Confirmar venta</button>
            </div>
          </div>
        </div>
      )}

      {modalReclamo && (
        <div className="modal-backdrop" onClick={() => setModalReclamo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar reclamo</h2>
              <button className="modal-close" onClick={() => setModalReclamo(null)}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label>Motivo del reclamo *</label>
              <textarea 
                rows={4} 
                value={motivoReclamo} 
                onChange={(e) => setMotivoReclamo(e.target.value)} 
                placeholder="Describe el motivo del reclamo..."
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setModalReclamo(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={enviarReclamo}>Registrar reclamo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
