'use strict';
(() => {
  // Keep the homepage collection intact; the game excludes Ship's 15° sail.
  // Close the reference layout's display offsets with rigid translations,
  // shared by the puzzle front and its solution (never stretch the pieces).
  const shapes = window.TangramShapes.filter(shape => shape.name !== 'SHIP').map(shape => ({
    ...shape,
    pieces: shape.pieces.map((points, index) => points.map(([x, y]) => [
      x + (shape.name === 'BUNNY' && index === 6 ? Math.SQRT2 / 4 : 0),
      y + (shape.name === 'DOLPHIN' && index === 2 ? Math.SQRT2 / 4 : 0)
    ]))
  }));
  const ns = 'http://www.w3.org/2000/svg';
  const board = document.querySelector('#play-board');
  const draw = document.querySelector('#draw-card');
  const discard = document.querySelector('#discard-card');
  const deckElement = document.querySelector('.deck');
  const tutorial = document.querySelector('#movement-tutorial');
  const flipButton = document.querySelector('#flip-piece');
  const status = document.querySelector('#game-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['Large triangle 1', 'Large triangle 2', 'Medium triangle', 'Small triangle 1', 'Square', 'Small triangle 2', 'Parallelogram'];
  const slots = [[.22,.22],[.68,.22],[.43,.52],[.82,.55],[.17,.62],[.40,.83],[.72,.85]];
  let deck = [], cardIndex = 0, busy = false;
  let width = 720, height = 440, unit = Math.min((720 - 24) / 11.4, (440 - 24) / 10.7), selected = -1, gesture = null;
  let boardReady = false;
  let resizeFrame = 0;

  function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  function inset(points, distance) {
    const area = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    const normals = points.map((p, i) => {
      const q = points[(i + 1) % points.length], dx = q[0] - p[0], dy = q[1] - p[1], length = Math.hypot(dx, dy);
      return [-dy / length * Math.sign(area), dx / length * Math.sign(area)];
    });
    return points.map((p, i) => {
      const a = normals[(i + points.length - 1) % points.length], b = normals[i];
      const factor = distance / (1 + a[0] * b[0] + a[1] * b[1]);
      return [p[0] + (a[0] + b[0]) * factor, p[1] + (a[1] + b[1]) * factor];
    });
  }

  function silhouettePath(pieces) {
    // One compound fill with consistent winding behaves as a union, including
    // overlapping pieces. Mixed winding cut holes in the old card fronts.
    // Normalize equivalent floating-point vertices so shared edges coincide.
    return pieces.map(points => {
      const area = points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0);
      const outline = area < 0 ? points.slice().reverse() : points;
      return 'M' + outline.map(p => p.map(v => Number(v.toFixed(9))).join(',')).join('L') + 'Z';
    }).join(' ');
  }

  function cardMarkup(shape, solution = false) {
    const points = shape.pieces.flat(), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
    const padding = .25;
    const paths = solution
      ? shape.pieces.map(p => `<polygon class="card-figure" points="${inset(p, .035).map(v => v.join(',')).join(' ')}"/>`).join('')
      : `<path class="card-figure" fill-rule="nonzero" d="${silhouettePath(shape.pieces)}"/>`;
    return `<svg viewBox="${minX - padding} ${minY - padding} ${w + padding * 2} ${h + padding * 2}" aria-hidden="true">${paths}</svg><span class="card-name">${shape.name.toLowerCase()}${solution ? ' · solution' : ''}</span>`;
  }

  function renderDraw() {
    const remaining = deck.length - cardIndex;
    document.querySelector('#deck-count').textContent = String(remaining).padStart(2, '0');
    draw.parentElement.classList.toggle('is-empty', remaining === 0);
    if (!remaining) {
      draw.innerHTML = '<span>All cards turned.</span><span class="card-name">Shuffle deck ↻</span>';
      draw.setAttribute('aria-label', 'All puzzles revealed. Shuffle the deck to play again');
      return;
    }
    const shape = deck[cardIndex];
    draw.innerHTML = cardMarkup(shape);
    draw.setAttribute('aria-label', `${shape.name.toLowerCase()} puzzle. Reveal its solution and draw the next puzzle`);
  }

  function renderDiscard() {
    document.querySelector('#discard-count').textContent = String(cardIndex);
    discard.disabled = busy || cardIndex === 0;
    if (!cardIndex) {
      discard.className = 'puzzle-card empty-card';
      discard.innerHTML = '<span>Solutions land here</span>';
      discard.setAttribute('aria-label', 'Discard pile is empty');
      return;
    }
    const shape = deck[cardIndex - 1];
    discard.className = 'puzzle-card solution';
    discard.innerHTML = cardMarkup(shape, true);
    discard.setAttribute('aria-label', `${shape.name.toLowerCase()} solution. Return this card to the draw pile`);
  }

  function shuffleDeck() {
    deck = shapes.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cardIndex = 0;
    renderDiscard();
    renderDraw();
  }

  async function turnCard(reverse = false) {
    if (busy || (reverse && cardIndex === 0)) return;
    if (!reverse && cardIndex === deck.length) { shuffleDeck(); status.textContent = 'Deck shuffled. A new puzzle is ready.'; return; }
    busy = true;
    draw.disabled = true;
    discard.disabled = true;
    const shape = deck[cardIndex - (reverse ? 1 : 0)];
    const from = (reverse ? discard : draw).getBoundingClientRect(), to = (reverse ? draw : discard).getBoundingClientRect(), parent = deckElement.getBoundingClientRect();
    const flying = document.createElement('div');
    flying.className = 'flying-card';
    flying.setAttribute('aria-hidden', 'true');
    Object.assign(flying.style, { left: `${from.left - parent.left}px`, top: `${from.top - parent.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    flying.innerHTML = `<div class="puzzle-card ${reverse ? 'solution' : ''} card-face">${cardMarkup(shape, reverse)}</div><div class="puzzle-card ${reverse ? '' : 'solution'} card-face card-back">${cardMarkup(shape, !reverse)}</div>`;
    deckElement.append(flying);
    cardIndex += reverse ? -1 : 1;
    if (reverse) renderDiscard(); else renderDraw();
    try {
      if (!reducedMotion.matches && typeof flying.animate === 'function') {
        const dx = to.left - from.left, dy = to.top - from.top;
        await flying.animate([
          { transform: 'translate(0,0) rotateY(0deg)' },
          { transform: `translate(${dx * .5}px,${dy - 28}px) rotateY(90deg)`, offset: .5 },
          { transform: `translate(${dx}px,${dy}px) rotateY(180deg)` }
        ], { duration: 680, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished;
      }
    } catch (_) {
      // A cancelled animation must still leave a usable deck.
    } finally {
      flying.remove();
      busy = false;
      draw.disabled = false;
      renderDraw();
      renderDiscard();
      if (reverse && cardIndex === 0) draw.focus({ preventScroll: true });
      status.textContent = reverse ? `${shape.name.toLowerCase()} returned to the draw pile.` : `${shape.name.toLowerCase()} solution revealed. ${cardIndex < deck.length ? 'Next puzzle: ' + deck[cardIndex].name.toLowerCase() + '.' : 'All puzzles revealed. Shuffle the deck to play again.'}`;
    }
  }

  // All pieces share one scale. Their proportions never change on resize.
  const pieces = shapes[0].pieces.map((points, i) => {
    const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const group = svgElement('g', { class: 'play-piece', tabindex: '0', role: 'button', 'aria-label': names[i], 'aria-describedby': 'board-instructions', 'aria-pressed': 'false', 'data-piece': i });
    const face = svgElement('polygon', { class: 'piece-face' });
    group.append(face);
    const corners = points.map((_, index) => {
      const hit = svgElement('circle', { class: 'corner-hit', 'data-corner': index, 'aria-hidden': 'true' });
      const dot = svgElement('circle', { class: 'corner-dot', r: 3.5, 'aria-hidden': 'true' });
      group.append(hit, dot);
      return { hit, dot };
    });
    board.append(group);
    group.addEventListener('focus', () => selectPiece(i));
    group.addEventListener('keydown', event => keyMove(event, i));
    return { points: points.map(([x, y]) => [x - cx, y - cy]), x: slots[i][0] * width, y: slots[i][1] * height, angle: 0, mirrored: false, group, face, corners };
  });

  function transformedPoints(piece) {
    const angle = piece.angle * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
    return piece.points.map(([x, y]) => {
      x *= piece.mirrored ? -unit : unit;
      y *= unit;
      return [x * c - y * s, x * s + y * c];
    });
  }

  function constrain(piece, points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    piece.x = Math.max(10 - Math.min(...xs), Math.min(width - 10 - Math.max(...xs), piece.x));
    piece.y = Math.max(10 - Math.min(...ys), Math.min(height - 10 - Math.max(...ys), piece.y));
  }

  function paintPiece(piece) {
    const points = transformedPoints(piece);
    constrain(piece, points);
    piece.group.setAttribute('transform', `translate(${piece.x} ${piece.y})`);
    // Actual insets preserve transparent gaps, without painting a stroke.
    piece.face.setAttribute('points', inset(points, 1.2).map(p => p.join(',')).join(' '));
    points.forEach(([x, y], i) => {
      const radius = Math.min(22, Math.hypot(x, y) * .43);
      for (const element of [piece.corners[i].hit, piece.corners[i].dot]) { element.setAttribute('cx', x); element.setAttribute('cy', y); }
      piece.corners[i].hit.setAttribute('r', radius);
    });
  }

  function selectPiece(index) {
    selected = index;
    pieces.forEach((piece, i) => {
      piece.group.classList.toggle('selected', i === index);
      piece.group.setAttribute('aria-pressed', String(i === index));
    });
    document.querySelector('#piece-label').textContent = index < 0 ? 'Seven pieces' : names[index];
    flipButton.disabled = index !== 6;
  }

  function pointerPosition(event) {
    const matrix = board.getScreenCTM();
    if (!matrix) return null;
    const point = board.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function startGesture(event) {
    if (gesture || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const group = event.target.closest('[data-piece]');
    if (!group) { selectPiece(-1); return; }
    const index = Number(group.dataset.piece), piece = pieces[index], point = pointerPosition(event);
    if (!point) return;
    event.preventDefault();
    selectPiece(index);
    board.append(group);
    group.focus({ preventScroll: true });
    const rotate = event.target.hasAttribute('data-corner');
    gesture = { id: event.pointerId, piece, rotate, rotation: piece.angle, offsetX: point.x - piece.x, offsetY: point.y - piece.y, lastAngle: Math.atan2(point.y - piece.y, point.x - piece.x) };
    group.classList.add(rotate ? 'rotating' : 'dragging');
    board.setPointerCapture(event.pointerId);
  }

  function moveGesture(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    event.preventDefault();
    const point = pointerPosition(event);
    if (!point) return;
    const { piece } = gesture;
    if (gesture.rotate) {
      const angle = Math.atan2(point.y - piece.y, point.x - piece.x);
      let delta = angle - gesture.lastAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      gesture.rotation += delta * 180 / Math.PI;
      piece.angle = Math.round(gesture.rotation / 45) * 45;
      gesture.lastAngle = angle;
    } else {
      piece.x = point.x - gesture.offsetX; piece.y = point.y - gesture.offsetY;
    }
    paintPiece(piece);
  }

  function endGesture(event) {
    if (!gesture || (event && event.pointerId !== gesture.id)) return;
    const { piece, rotate, id } = gesture;
    if (rotate) {
      piece.angle = Math.round(piece.angle / 45) * 45;
      piece.angle = ((piece.angle % 360) + 360) % 360;
    }
    piece.group.classList.remove('dragging', 'rotating');
    gesture = null;
    if (board.hasPointerCapture(id)) board.releasePointerCapture(id);
    paintPiece(piece);
  }

  function flipSelected() {
    if (selected !== 6) return;
    pieces[6].mirrored = !pieces[6].mirrored;
    paintPiece(pieces[6]);
    status.textContent = 'Parallelogram flipped.';
  }

  function keyMove(event, index) {
    if (gesture) return;
    const piece = pieces[index], amount = event.shiftKey ? 16 : 4;
    const key = event.key.toLowerCase();
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'q', 'e', 'f', 'enter', ' '].includes(key)) return;
    event.preventDefault();
    selectPiece(index);
    if (key === 'arrowleft') piece.x -= amount;
    if (key === 'arrowright') piece.x += amount;
    if (key === 'arrowup') piece.y -= amount;
    if (key === 'arrowdown') piece.y += amount;
    if (key === 'q') piece.angle -= 45;
    if (key === 'e') piece.angle += 45;
    if (key === 'f') flipSelected();
    paintPiece(piece);
  }

  function resetPieces() {
    endGesture();
    pieces.forEach((piece, i) => {
      piece.x = slots[i][0] * width; piece.y = slots[i][1] * height;
      piece.angle = 0; piece.mirrored = false;
      paintPiece(piece);
    });
    selectPiece(-1);
    status.textContent = 'Pieces reset.';
  }

  function resizeBoard() {
    const rect = board.getBoundingClientRect();
    if (!rect.width || !rect.height || (Math.abs(rect.width - width) < .5 && Math.abs(rect.height - height) < .5)) return;
    endGesture();
    const previousWidth = width, previousHeight = height, previousUnit = unit;
    width = rect.width; height = rect.height;
    // Leave enough room for the widest fox and tallest candle silhouettes.
    unit = Math.min((width - 24) / 11.4, (height - 24) / 10.7);
    board.setAttribute('viewBox', `0 0 ${width} ${height}`);
    pieces.forEach((piece, i) => {
      // Resize positions and geometry together to preserve assembled puzzles.
      piece.x = boardReady ? width / 2 + (piece.x - previousWidth / 2) * unit / previousUnit : slots[i][0] * width;
      piece.y = boardReady ? height / 2 + (piece.y - previousHeight / 2) * unit / previousUnit : slots[i][1] * height;
      paintPiece(piece);
    });
    boardReady = true;
  }

  function showTutorial() { if (!tutorial.open) tutorial.showModal(); }
  draw.addEventListener('click', () => turnCard());
  discard.addEventListener('click', () => turnCard(true));
  board.addEventListener('pointerdown', startGesture);
  board.addEventListener('pointermove', moveGesture);
  board.addEventListener('pointerup', endGesture);
  board.addEventListener('pointercancel', endGesture);
  board.addEventListener('lostpointercapture', endGesture);
  flipButton.addEventListener('click', flipSelected);
  document.querySelector('#reset-pieces').addEventListener('click', resetPieces);
  document.querySelector('#help').addEventListener('click', showTutorial);
  document.querySelector('#close-tutorial').addEventListener('click', () => { tutorial.close(); draw.focus({ preventScroll: true }); });
  new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resizeBoard); }).observe(board);
  window.addEventListener('pagehide', () => endGesture());
  shuffleDeck();
  resizeBoard();
  pieces.forEach(paintPiece);
  showTutorial();
})();
