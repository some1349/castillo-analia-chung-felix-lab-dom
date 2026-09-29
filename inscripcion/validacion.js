// ===== 1. Elementos que vamos a usar =====
const form = document.querySelector('#inscripcion');
const campoSede = document.querySelector('#campo-sede');
const confirmacion = document.querySelector('#confirmacion');
const barra = document.querySelector('#medidor-barra');
const textoFuerza = document.querySelector('#clave-fuerza');
const contador = document.querySelector('#comentarios-contador');
const tocados = new Set();

// ===== 2. Reglas: cada una devuelve true o el mensaje de error =====
const soloLetras = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/;

function leerFecha(texto) {
  // "2008-05-20" -> fecha local (evita que se corra un día por la zona horaria)
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const reglas = {
  nombre: v => {
    const t = v.trim();
    return (t.length >= 5 && t.length <= 60 && soloLetras.test(t))
      || 'Escribe tu nombre y apellido.';
  },

  cedula: v => /^([1-9]|1[0-3]|PE|E|N)-\d{1,4}-\d{1,6}$/i.test(v.trim())
    || 'Usa el formato 8-123-4567.',

  correo: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    || 'Usa un correo como nombre@dominio.com.',

  celular: v => /^6\d{3}-?\d{4}$/.test(v.trim())
    || 'El celular debe tener 8 dígitos y empezar con 6.',

  nacimiento: v => {
    if (!v) return 'Ingresa tu fecha de nacimiento.';
    const fecha = leerFecha(v);
    if (fecha > new Date()) return 'La fecha no puede ser futura.';
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - 16);
    return fecha <= limite || 'Debes tener al menos 16 años.';
  },

  curso: v => v !== '' || 'Elige un curso.',

  modalidad: v => v !== '' || 'Elige una modalidad.',

  // La sede solo es obligatoria si la modalidad es presencial
  sede: v => form.modalidad.value !== 'presencial' || v !== '' || 'Elige una sede.',

  clave: v => {
    const falta = [];
    if (v.length < 8) falta.push('8 caracteres');
    if (!/[A-Z]/.test(v)) falta.push('una mayúscula');
    if (!/[a-z]/.test(v)) falta.push('una minúscula');
    if (!/\d/.test(v)) falta.push('un número');
    if (!/[^A-Za-z0-9]/.test(v)) falta.push('un símbolo');
    return falta.length === 0 || `Te falta: ${falta.join(', ')}.`;
  },

  clave2: v => (v !== '' && v === form.clave.value) || 'Las contraseñas no coinciden.',

  comentarios: v => v.length <= 200 || 'Máximo 200 caracteres.',

  terminos: v => v === true || 'Debes aceptar los términos.',
};

// ===== 3. Una sola función que aplica las reglas =====
function obtenerValor(input) {
  if (input.type === 'checkbox') return input.checked;              // true / false
  if (input.type === 'radio') return form.elements[input.name].value; // el radio marcado
  return input.value;
}

function validarCampo(input) {
  const resultado = reglas[input.name](obtenerValor(input));
  const valido = resultado === true;

  // En los radios marcamos todo el grupo, no solo uno
  const grupo = input.type === 'radio'
    ? form.querySelectorAll(`[name="${input.name}"]`)
    : [input];
  grupo.forEach(el => el.setAttribute('aria-invalid', String(!valido)));

  document.getElementById(`${input.name}-error`).textContent = valido ? '' : resultado;
  return valido;
}

// ===== 4. Extras: medidor de fuerza y contador =====
function actualizarFuerza(v) {
  let puntos = 0;
  if (v.length >= 8) puntos++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) puntos++;
  if (/\d/.test(v)) puntos++;
  if (/[^A-Za-z0-9]/.test(v)) puntos++;
  if (v.length >= 12) puntos++;

  const niveles = [
    ['—', '0%', 'red'],
    ['Muy débil', '20%', 'red'],
    ['Débil', '40%', 'red'],
    ['Aceptable', '60%', 'orange'],
    ['Buena', '80%', 'green'],
    ['Fuerte', '100%', 'green'],
  ];
  const [texto, ancho, color] = niveles[v ? Math.max(puntos, 1) : 0];
  barra.style.width = ancho;
  barra.style.background = color;
  textoFuerza.textContent = `Fuerza: ${texto}`;
}

function actualizarContador() {
  const n = form.comentarios.value.length;
  contador.textContent = `${n} / 200`;
  contador.classList.toggle('aviso', n > 180 && n <= 200);
  contador.classList.toggle('excedido', n > 200);
}

// ===== 5. Eventos (patrón 3.4 del laboratorio) =====

// Primera validación: al salir del campo
form.addEventListener('blur', (e) => {
  if (!reglas[e.target.name]) return;
  tocados.add(e.target.name);
  validarCampo(e.target);
}, true); // true = fase de captura (blur no burbujea)

// Después: en vivo, en cada tecla
form.addEventListener('input', (e) => {
  const campo = e.target;
  if (campo.name === 'clave') {
    actualizarFuerza(campo.value);
    if (tocados.has('clave2')) validarCampo(form.clave2); // revalida la confirmación
  }
  if (campo.name === 'comentarios') actualizarContador();
  if (tocados.has(campo.name)) validarCampo(campo);
});

// Modalidad: mostrar u ocultar la sede
form.addEventListener('change', (e) => {
  if (e.target.name !== 'modalidad') return;
  const presencial = e.target.value === 'presencial';
  campoSede.hidden = !presencial;

  if (!presencial) {
    // Si cambia a virtual: se limpia la sede y deja de validarse
    form.sede.value = '';
    form.sede.removeAttribute('aria-invalid');
    document.getElementById('sede-error').textContent = '';
    tocados.delete('sede');
  }
  tocados.add('modalidad');
  validarCampo(e.target);
});

// Al enviar: validar todo y llevar el foco al primer error
form.addEventListener('submit', (e) => {
  e.preventDefault(); // no recargar la página

  // Un elemento por nombre (los dos radios cuentan como un solo campo)
  const vistos = new Set();
  const campos = [...form.elements].filter(el => {
    if (!reglas[el.name] || vistos.has(el.name)) return false;
    vistos.add(el.name);
    return true;
  });

  campos.forEach(el => tocados.add(el.name));
  const invalidos = campos.filter(el => !validarCampo(el));
  if (invalidos.length) {
    invalidos[0].focus();
    return;
  }

  mostrarConfirmacion(new FormData(form));
  reiniciar();
});

// ===== 6. Tarjeta de confirmación y reinicio =====
function mostrarConfirmacion(datos) {
  confirmacion.textContent = ''; // borra una tarjeta anterior

  const tarjeta = document.createElement('div');
  tarjeta.className = 'tarjeta';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Inscripción recibida';

  const [anio, mes, dia] = datos.get('nacimiento').split('-');
  const presencial = datos.get('modalidad') === 'presencial';

  // Sin contraseña, como pide la tarea
  const filas = [
    ['Nombre', datos.get('nombre').trim()],
    ['Cédula', datos.get('cedula').trim().toUpperCase()],
    ['Correo', datos.get('correo').trim()],
    ['Celular', datos.get('celular').trim()],
    ['Fecha de nacimiento', `${dia}/${mes}/${anio}`],
    ['Curso', datos.get('curso')],
    ['Modalidad', presencial ? 'Presencial' : 'Virtual'],
  ];
  if (presencial) filas.push(['Sede', datos.get('sede')]);
  const comentarios = datos.get('comentarios').trim();
  if (comentarios) filas.push(['Comentarios', comentarios]);

  const lista = document.createElement('dl');
  filas.forEach(([etiqueta, valor]) => {
    const dt = document.createElement('dt');
    dt.textContent = etiqueta; // textContent, nunca innerHTML
    const dd = document.createElement('dd');
    dd.textContent = valor;
    lista.append(dt, dd);
  });

  tarjeta.append(titulo, lista);
  confirmacion.append(tarjeta);
}

function reiniciar() {
  form.reset();
  tocados.clear();
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  campoSede.hidden = true;
  actualizarFuerza('');
  actualizarContador();
}