// debugConsole.js - Debug UI with physics controls and console logging

const v = window.__BUILD || Date.now();
const { PHYSICS } = await import(`./config.js?v=${v}`);

export function initDebugConsole() {
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    maxHeight: '40vh',
    background: 'rgba(0, 0, 0, 0.95)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflowY: 'auto',
    borderTop: '2px solid #333',
    display: 'none',
    zIndex: '10000',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '8px 10px',
    background: '#1a1a1a',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const title = document.createElement('span');
  title.textContent = 'Debug Console';
  title.style.fontWeight = 'bold';

  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    display: 'flex',
    gap: '8px',
  });

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  Object.assign(copyBtn.style, {
    padding: '4px 8px',
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
  });

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  Object.assign(clearBtn.style, {
    padding: '4px 8px',
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
  });

  buttonContainer.appendChild(copyBtn);
  buttonContainer.appendChild(clearBtn);

  header.appendChild(title);
  header.appendChild(buttonContainer);

  // Settings section
  const settings = document.createElement('div');
  Object.assign(settings.style, {
    padding: '10px',
    background: '#1a1a1a',
    borderBottom: '1px solid #333',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    fontSize: '11px',
  });

  const settingsTitle = document.createElement('div');
  settingsTitle.textContent = 'Physics Settings';
  settingsTitle.style.gridColumn = '1 / -1';
  settingsTitle.style.fontWeight = 'bold';
  settingsTitle.style.marginBottom = '4px';
  settings.appendChild(settingsTitle);

  // Helper to create labeled input
  function createInput(label, value, min, max, step) {
    const wrapper = document.createElement('div');
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.display = 'block';
    labelEl.style.marginBottom = '2px';
    labelEl.style.color = '#aaa';

    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.min = min;
    input.max = max;
    input.step = step;
    Object.assign(input.style, {
      width: '100%',
      padding: '4px',
      background: '#222',
      color: '#fff',
      border: '1px solid #444',
      borderRadius: '3px',
      fontSize: '11px',
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return { wrapper, input };
  }

  const gravityInput = createInput('Gravity', PHYSICS.GRAVITY, '0', '2', '0.1');
  const frictionInput = createInput('Friction', PHYSICS.FRICTION, '0', '1', '0.01');
  const bounceInput = createInput('Bounce', PHYSICS.BOUNCE, '0', '1', '0.05');

  settings.appendChild(gravityInput.wrapper);
  settings.appendChild(frictionInput.wrapper);
  settings.appendChild(bounceInput.wrapper);

  // Apply button
  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply Settings';
  Object.assign(applyBtn.style, {
    gridColumn: '1 / -1',
    padding: '6px',
    background: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    marginTop: '4px',
  });
  settings.appendChild(applyBtn);

  const messages = document.createElement('div');
  Object.assign(messages.style, {
    padding: '10px',
    maxHeight: 'calc(40vh - 40px)',
    overflowY: 'auto',
  });

  container.appendChild(header);
  container.appendChild(settings);
  container.appendChild(messages);
  document.body.appendChild(container);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '🐛';
  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: '#333',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: '10001',
  });
  document.body.appendChild(toggleBtn);

  let isVisible = false;
  toggleBtn.addEventListener('click', () => {
    isVisible = !isVisible;
    container.style.display = isVisible ? 'block' : 'none';
    toggleBtn.textContent = isVisible ? '✕' : '🐛';
  });

  copyBtn.addEventListener('click', async () => {
    const text = messages.innerText;
    try {
      await navigator.clipboard.writeText(text);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.style.background = '#4caf50';
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#333';
      }, 2000);
    } catch (err) {
      copyBtn.textContent = 'Failed';
      copyBtn.style.background = '#f44336';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.style.background = '#333';
      }, 2000);
      console.error('Copy failed:', err);
    }
  });

  clearBtn.addEventListener('click', () => (messages.innerHTML = ''));

  applyBtn.addEventListener('click', () => {
    if (window.gamePhysics) {
      window.gamePhysics.gravity = parseFloat(gravityInput.input.value);
      window.gamePhysics.friction = parseFloat(frictionInput.input.value);
      window.gamePhysics.bounce = parseFloat(bounceInput.input.value);

      const originalText = applyBtn.textContent;
      const originalBg = applyBtn.style.background;
      applyBtn.textContent = 'Applied!';
      applyBtn.style.background = '#4caf50';

      console.log('Physics settings updated:', {
        gravity: window.gamePhysics.gravity,
        friction: window.gamePhysics.friction,
        bounce: window.gamePhysics.bounce,
      });

      setTimeout(() => {
        applyBtn.textContent = originalText;
        applyBtn.style.background = originalBg;
      }, 1500);
    }
  });

  function addMessage(type, args) {
    const msg = document.createElement('div');
    Object.assign(msg.style, {
      padding: '4px 0',
      borderBottom: '1px solid #222',
    });

    const timestamp = new Date().toLocaleTimeString();
    const typeColors = { log: '#aaa', warn: '#ff9800', error: '#f44336', info: '#2196f3' };

    const typeSpan = document.createElement('span');
    typeSpan.textContent = `[${timestamp}] [${type.toUpperCase()}] `;
    typeSpan.style.color = typeColors[type] || '#aaa';

    const contentSpan = document.createElement('span');
    contentSpan.textContent = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(' ');

    msg.appendChild(typeSpan);
    msg.appendChild(contentSpan);
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  const orig = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  console.log = (...a) => (orig.log(...a), addMessage('log', a));
  console.warn = (...a) => (orig.warn(...a), addMessage('warn', a));
  console.error = (...a) => (orig.error(...a), addMessage('error', a));
  console.info = (...a) => (orig.info(...a), addMessage('info', a));

  window.addEventListener('error', (e) =>
    addMessage('error', [`Uncaught: ${e.message}`, `at ${e.filename}:${e.lineno}:${e.colno}`])
  );
  window.addEventListener('unhandledrejection', (e) =>
    addMessage('error', [`Unhandled Promise Rejection: ${e.reason}`])
  );

  console.log('Debug console initialized. Click 🐛 to toggle.');
  return { container, toggleBtn };
}
