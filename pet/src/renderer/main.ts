import type { SpeciesConfig, ChatterConfig, PetMotion, SpeciesAnimationDef } from '../shared/speciesSchema';
import type { PetState } from '../shared/petState';
import { PetStateMachine } from './PetStateMachine';
import { AnimationController } from './AnimationController';
import { PetRenderer } from './PetRenderer';
import { PetEffects } from './PetEffects';
import { PetQuickMenu } from './PetQuickMenu';
import { EmptyRosterPaper } from './EmptyRosterPaper';
import { FishingRig, type FishingPose } from './FishingRig';
import { BehaviorController } from './BehaviorController';
import type { Rect, Vec2 } from './types';
import { advanceFlight, landingReaction, launchVelocity, releaseVelocity, RELEASE_SAMPLE_WINDOW_MS, type Flight, type PointerSample } from './throwMotion';
import { motionCue, personalityOf, poseFor, type MotionCue } from './petMotion';
import { canHitPet, petContact, petRebound, wallSide, type CollisionPath } from './petCollision';

interface Companion {
  species: SpeciesConfig;
  state: PetStateMachine;
  animation: AnimationController;
  behavior: BehaviorController;
  bubble: HTMLDivElement;
  until: number;
  speakingUntil: number;
  facing: number;
  airborne?: Flight;
  collisionPath?: CollisionPath;
  cue?: MotionCue;
  clip?: SpeciesAnimationDef;
  playbackKey?: PetMotion | PetState;
  throwSpeed: number;
  impactSpeed: number;
  impactSide: -1 | 1;
  nextCueAt: number;
  nextLookAt: number;
  pointerDistance: number;
  reactionUntil: number;
  sideWalk?: SideWalk;
  chasing?: boolean;
  nextBurstAt?: number;
  firePending?: boolean;
  toyPlay?: { origin: Vec2; position: Vec2; strike: Vec2; aim: Vec2; side: -1 | 1; hit: boolean };
}

interface SideWalk {
  side: -1 | 1;
  elapsed: number;
  legMs: number;
}

const SIDE_WALK_HEIGHT_RATIO = 0.45;

function sideWalkProgress(walk: SideWalk) {
  const phase = walk.elapsed / walk.legMs;
  const progress = Math.min(phase, 2 - phase);
  return progress * progress * (3 - 2 * progress);
}

function sideWalkScale(pet: Companion, progress: number) {
  return 1 - (pet.species.behavior.sideWalkDepth ?? 0) * progress;
}

function currentPose(pet: Companion, now: number) {
  if (pet.cue) return poseFor(pet.cue, now, pet.species);
  if (!pet.sideWalk) return undefined;
  const scale = sideWalkScale(pet, sideWalkProgress(pet.sideWalk));
  return scale === 1 ? undefined : { tilt: 0, scaleX: scale, scaleY: scale, lift: 0, wall: pet.sideWalk.side };
}
const HOVER_EXIT_PADDING = 5;

const REACTION_LINES = {
  grab: ['으앗, 잡지 마아!', '잠깐만, 나 내려갈래!', '히익! 발이 땅에서 떨어졌어!'],
  bump: ['아야야!', '아야, 코야!', '아야! 벽이 딱딱해에!'],
  landing: ['다음엔 살포시 내려줘, 응?', '으앗, 엉덩이야… 다음엔 살살!', '다음엔 던지기 말고 살포시, 약속!'],
  playful: ['한 번 더!', '이번엔 조금 더 멀리!', '오, 또 해줘!'],
};

function animationFor(species: SpeciesConfig, state: PetState) {
  return species.animations[state] ??
    (state === 'hurt' ? species.animations.react : undefined) ?? species.animations.idle;
}

function cueAnimation(species: SpeciesConfig, { key: motion, strength }: MotionCue, facing: number) {
  if (species.motions?.[motion] && (motion !== 'wallImpact' || strength > 0.5)) return species.motions[motion];
  if ((facing === 2 || facing === 6) && species.motions?.sideIdle && (motion === 'curious' || motion === 'meet' || motion === 'startle')) {
    return species.motions.sideIdle;
  }
  const fallback: Partial<Record<PetMotion, PetState>> = {
    fly: 'dragged', wallFall: 'dragged', land: 'sit', ouch: 'hurt',
    doze: 'sit', curious: 'react', startle: 'react', slip: 'walk',
  };
  if (motion === 'wallImpact' || motion === 'petBump') return animationFor(species, strength > 0.5 ? 'hurt' : 'idle');
  return animationFor(species, fallback[motion] ?? 'idle');
}

async function main(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
  const renderer = new PetRenderer(canvas);
  const effects = new PetEffects(canvas.getContext('2d')!);
  const bounds = await window.petAPI.getWorkArea();
  const petSize = (pet: Companion) => pet.species.animations.idle?.displaySize ?? (pet.species.animations.idle?.frameWidth ?? 475) * pet.species.behavior.spriteScale;
  const floorX = (x: number, size: number) => Math.max(0, Math.min(Math.max(0, bounds.width - size), x));
  const petPosition = (pet: Companion) => {
    const activePosition = pet.toyPlay?.position ?? pet.airborne?.position;
    if (activePosition) return activePosition;
    const size = petSize(pet);
    const floor = Math.max(0, bounds.height - size);
    const walk = pet.sideWalk;
    if (!walk) return { x: floorX(pet.behavior.getPosition().x, size), y: floor };
    const progress = sideWalkProgress(walk);
    const climb = floor * SIDE_WALK_HEIGHT_RATIO * progress;
    const corner = Math.min(1, climb / 30);
    const sideInsets = pet.species.behavior.sideWalkInsets;
    const margin = (walk.side < 0 ? sideInsets?.left : sideInsets?.right) ?? 0;
    const right = Math.max(0, bounds.width - size);
    const offset = right > 0 && !pet.cue
      ? Math.max(0, margin * pet.species.behavior.spriteScale * sideWalkScale(pet, progress) - 2) *
        corner * corner * (3 - 2 * corner) : 0;
    return { x: walk.side < 0 ? -offset : right + offset, y: floor - climb };
  };
  let pets: Companion[] = [];
  let sceneReady = false;
  let chatter: ChatterConfig | undefined;
  let nextChat = Infinity;
  let nextMeeting = 0;
  let nextEncounter = 0;
  let previous = performance.now();
  let reply: { pet: Companion; text: string; at: number } | null = null;
  let pointer: Vec2 = { x: -1000, y: -1000 };
  let held: { pet: Companion; pointerId: number; start: Vec2; offset: Vec2; since: number; dragging: boolean; samples: PointerSample[] } | null = null;
  let clickThrough = true;
  let hoveredPet: Companion | undefined;
  let toyEnabled = false;
  let toyNextPlayAt = 0;
  let lastPointerAt = -Infinity;
  let nextCursorPoll = 0;
  let toyPointer = { ...pointer };
  let toyProp: SpeciesAnimationDef | undefined;
  let fishingRig = new FishingRig();
  let fishingPose: FishingPose | undefined;
  const propAnimation = new AnimationController();
  const hasToy = (pet: Companion) => !!(pet.species.motions?.toyWatch && pet.species.motions.toyPounce &&
    (pet.species.fishingToy || pet.species.motions.toyRod));
  const toyOwner = () => pets.find(hasToy);
  function toggleToy() {
    toyEnabled = !toyEnabled && !!toyOwner();
    toyProp = undefined;
    fishingPose = undefined;
    fishingRig = new FishingRig();
  }
  const petMenu = new PetQuickMenu(toggleToy);
  const emptyPaper = new EmptyRosterPaper((anchor) => petMenu.open(anchor, false, false, true));
  let nextPointerPoll = 0;
  const pollPointer = () => !held && (clickThrough || !!hoveredPet || pets.some((pet) => pet.chasing));
  document.addEventListener('pointermove', (event) => {
    if (sceneReady && pets.length === 0 && event.isPrimary) {
      pointer = { x: event.clientX, y: event.clientY };
      lastPointerAt = performance.now();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!event.defaultPrevented && event.key === 'Escape' && toyEnabled) toggleToy();
  });
  canvas.addEventListener('wheel', (event) => {
    if (!toyEnabled || petMenu.isOpen || !toyOwner()?.species.fishingToy) return;
    event.preventDefault();
    toyPointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    fishingRig.wheel((event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 18 : 1));
  }, { passive: false });
  const resting = (pet: Companion) => pet.state.getState() === 'sleep' || pet.cue?.key === 'doze';
  function hush(pet: Companion) {
    if (reply?.pet === pet) reply = null;
    pet.until = 0;
    pet.speakingUntil = 0;
    pet.reactionUntil = 0;
    pet.bubble.hidden = true;
  }
  function cue(pet: Companion, key: PetMotion, now: number, side: -1 | 1 = 1, strength = 0) {
    pet.cue = motionCue(pet.species, key, now, side, strength);
    if (key === 'doze') hush(pet);
  }
  const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  const schedule = () => {
    nextChat = performance.now() + 1000 * ((chatter?.minIntervalSec ?? 180) + Math.random() * ((chatter?.maxIntervalSec ?? 360) - (chatter?.minIntervalSec ?? 180)));
  };
  function say(pet: Companion, text: string, now: number, pause = true) {
    if (!canChat(pet, now)) return;
    pet.bubble.textContent = text;
    pet.until = now + (chatter?.bubbleSec ?? 7) * 1000;
    pet.speakingUntil = pause ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  function reactWithLine(pet: Companion, reaction: keyof typeof REACTION_LINES, now: number) {
    if (!chatter?.enabled || resting(pet)) return;
    if (reply?.pet === pet) reply = null;
    pet.bubble.textContent = random(REACTION_LINES[reaction]);
    pet.reactionUntil = now + (reaction === 'landing' ? 3200 : 1600);
    pet.until = pet.reactionUntil;
    pet.speakingUntil = reaction === 'landing' ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  const canChat = (pet: Companion, now: number) =>
    !resting(pet) && !pet.airborne && !pet.cue && !pet.sideWalk && held?.pet !== pet && now >= pet.reactionUntil;
  let pendingSchedule: { text: string; expires: number } | null = null;
  window.petAPI.onScheduleSpeech((text) => {
    pendingSchedule = { text, expires: performance.now() + 90_000 };
  });
  function converse(a: Companion, b: Companion, now: number) {
    if (!chatter || !canChat(a, now) || !canChat(b, now)) return;
    if (!a.species.dialogue?.dialogues.length && b.species.dialogue?.dialogues.length) [a, b] = [b, a];
    const lines = random(a.species.dialogue?.dialogues.length ? a.species.dialogue.dialogues : chatter.dialogues);
    if (!lines) return;
    say(a, lines[0], now);
    reply = { pet: b, text: lines[1], at: now + 1900 };
    b.speakingUntil = now + 1900 + chatter.bubbleSec * 1000;
    nextMeeting = now + 45000;
  }
  window.petAPI.onSceneCommand((command) => {
    if (command === 'toy') {
      toggleToy();
      return;
    }
    if (!chatter) return;
    if (command === 'quiet') {
      chatter.enabled = !chatter.enabled;
      reply = null;
      for (const pet of pets) { pet.until = 0; pet.speakingUntil = 0; pet.reactionUntil = 0; }
      schedule();
    } else if (chatter.enabled) {
      if (pets.length > 1) converse(pets[0], pets[1], performance.now());
      else if (pets.length) talkToUser(pets[0], performance.now());
      schedule();
    }
  });
  window.petAPI.onSpeciesLoaded((loaded) => {
    sceneReady = true;
    petMenu.close();
    toyEnabled = false;
    fishingPose = undefined;
    for (const pet of pets) pet.bubble.remove();
    reply = null; held = null; toyProp = undefined; renderer.clearCache(); chatter = loaded.chatter;
    const dismissed = new Set(loaded.dismissedIds);
    pets = [loaded, ...(loaded.companions ?? [])].filter(({ id }) => !dismissed.has(id)).map((species, index) => {
      renderer.preload(species.motions?.backWalk);
      renderer.preload(species.motions?.frontWalk);
      renderer.preload(species.motions?.fireBreath);
      const state = new PetStateMachine();
      const animation = new AnimationController();
      const size = species.animations.idle?.displaySize ?? (species.animations.idle?.frameWidth ?? 475) * species.behavior.spriteScale;
      const x = floorX(bounds.width * 0.25 + index * 160, size);
      const patrolDirection = species.motions?.frontWalk && species.motions.backWalk ?
        (x > (bounds.width - size) / 2 ? 1 : -1) : undefined;
      const behavior = new BehaviorController(state, species.behavior, { x, y: 0 }, () => ['idle', 'sit', 'sleep'], patrolDirection);
      const bubble = document.createElement('div');
      bubble.className = 'speech'; bubble.hidden = true; document.body.append(bubble);
      const initialAnimation = animationFor(species, state.getState());
      if (initialAnimation) animation.setAnimation(initialAnimation);
      const now = performance.now();
      return { species, state, animation, behavior, bubble, until: 0, speakingUntil: 0, facing: 0,
        clip: initialAnimation, playbackKey: state.getState(), reactionUntil: 0,
        throwSpeed: 0, impactSpeed: 0, impactSide: 1 as const, nextCueAt: now + 2400,
        nextLookAt: 0, pointerDistance: Infinity };
    });
    nextChat = performance.now() + 6000; nextMeeting = performance.now() + 20000; nextEncounter = performance.now() + 4000;
  });
  window.petAPI.onPetDismissed((id) => {
    const departing = pets.find((pet) => pet.species.id === id);
    if (!departing) return;
    const fishing = toyOwner() === departing;
    hush(departing);
    departing.bubble.remove();
    if (held?.pet === departing) held = null;
    pets = pets.filter((pet) => pet !== departing);
    if (fishing && toyEnabled) toggleToy();
  });
  function talkToUser(pet: Companion, now: number) {
    const lines = pet.species.dialogue?.solo;
    const line = random(lines?.length ? lines : chatter?.solo ?? []);
    if (line) say(pet, line, now);
  }
  window.petAPI.ready();
  const hit = () => [...pets].reverse().find((pet) => {
    const def = pet.clip;
    if (!def) return false;
    const frame = pet.animation.getCurrentFrameRect(pet.facing);
    const pose = currentPose(pet, previous);
    const pos = petPosition(pet);
    const scale = pet.species.behavior.spriteScale;
    const box = pose && frame ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize(pet)) : renderer.getSpriteBounds(def, pos, scale);
    // Keep the current target through small frame-to-frame changes at its edge.
    const padding = pet === hoveredPet ? HOVER_EXIT_PADDING : 0;
    return pointer.x >= box.x - padding && pointer.x <= box.x + box.width + padding &&
      pointer.y >= box.y - padding && pointer.y <= box.y + box.height + padding;
  });
  function beginDrag(grab: NonNullable<typeof held>) {
    grab.dragging = true;
    grab.pet.sideWalk = undefined;
    grab.pet.cue = undefined;
    grab.pet.state.transition('idle');
    grab.pet.behavior.interruptForDrag();
    hush(grab.pet);
    reactWithLine(grab.pet, 'grab', performance.now());
  }
  function positionHeld(grab: NonNullable<typeof held>) {
    const size = petSize(grab.pet);
    grab.pet.airborne = { position: {
      x: Math.max(0, Math.min(bounds.width - size, pointer.x - grab.offset.x)),
      y: Math.max(0, Math.min(bounds.height - size, pointer.y - grab.offset.y)),
    }, velocity: { x: 0, y: 0 } };
  }
  function moveHeld(event: PointerEvent) {
    if (!event.isPrimary || (held && held.pointerId !== event.pointerId)) return;
    pointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    toyPointer = pointer;
    if (!held) return;
    held.samples = held.samples.filter((sample) => event.timeStamp - sample.time <= RELEASE_SAMPLE_WINDOW_MS);
    held.samples.push({ ...pointer, time: event.timeStamp });
    const drift = Math.hypot(pointer.x - held.start.x, pointer.y - held.start.y);
    const flickVelocity = !held.dragging && event.type === 'pointerup' && drift >= 3 ? releaseVelocity(held.samples) : undefined;
    const finalFlick = !!flickVelocity && (flickVelocity.x !== 0 || flickVelocity.y !== 0);
    if (!held.dragging && (drift >= 5 || finalFlick)) beginDrag(held);
    if (held.dragging) positionHeld(held);
  }
  canvas.addEventListener('pointermove', moveHeld);
  canvas.addEventListener('mousemove', (event) => {
    if (!clickThrough) return;
    pointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    updateMouseTarget();
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 2 || event.shiftKey || held) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!hit()) return;
    event.preventDefault();
    petMenu.close();
    window.petAPI.openBookmarks();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || held || petMenu.isOpen) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit(); if (!pet) return;
    const pos = petPosition(pet);
    if (pet.toyPlay) {
      pet.toyPlay = undefined;
      pet.airborne = { position: pos, velocity: { x: 0, y: 0 } };
      toyNextPlayAt = performance.now() + 1200;
    }
    held = { pet, pointerId: event.pointerId, start: { ...pointer }, offset: { x: pointer.x - pos.x, y: pointer.y - pos.y },
      since: performance.now(), dragging: !!pet.airborne, samples: [{ ...pointer, time: event.timeStamp }] };
    if (pet.airborne) {
      pet.cue = undefined;
      pet.state.transition('idle');
      pet.state.transition('dragged');
      reactWithLine(pet, 'grab', performance.now());
    }
    canvas.setPointerCapture(event.pointerId);
  });
  function release(event: Event) {
    if (!held || (event instanceof PointerEvent && event.pointerId !== held.pointerId)) return;
    if (event instanceof PointerEvent && event.type === 'pointerup') moveHeld(event);
    const { pet, dragging, samples } = held;
    held = null;
    if (dragging && pet.airborne) {
      hush(pet);
      const velocity = event.type === 'pointerup' ? releaseVelocity(samples) : { x: 0, y: 0 };
      const { x, y } = velocity;
      const floor = Math.max(0, bounds.height - petSize(pet));
      pet.airborne.velocity = launchVelocity(velocity, floor - pet.airborne.position.y);
      pet.throwSpeed = Math.hypot(x, y);
      pet.collisionPath = event.type !== 'pointerup' ? undefined : pet.throwSpeed > 0 ? 'throw' :
        wallSide(pet.airborne.position, petSize(pet), bounds.width, bounds.height);
      pet.impactSpeed = 0;
      pet.impactSide = x < 0 ? -1 : 1;
      if (pet.throwSpeed > 0) cue(pet, 'fly', performance.now(), pet.impactSide, pet.throwSpeed / 1300);
    }
    else if (event.type === 'pointerup') {
      if (pet.sideWalk || resting(pet) || pet.chasing || (pet.nextBurstAt ?? 0) > performance.now()) return;
      pet.cue = undefined;
      pet.state.transition('idle'); pet.behavior.react();
      if (chatter?.enabled) talkToUser(pet, performance.now());
    }
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('dblclick', (event) => {
    if (event.button !== 0 || held || petMenu.isOpen) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit();
    const action = pet?.species.behavior.doubleClick;
    if (!pet || !action || pet.airborne) return;
    event.preventDefault();
    if (action === 'chase') {
      if (pet.chasing) {
        window.petAPI.runPetMenuAction({ kind: 'dismiss', id: pet.species.id });
      } else {
        if (toyEnabled && toyOwner() === pet) toggleToy();
        pet.toyPlay = undefined;
        pet.cue = undefined;
        hush(pet);
        pet.chasing = true;
      }
      return;
    }
    const now = performance.now();
    if ((pet.nextBurstAt ?? 0) > now) return;
    const pos = petPosition(pet);
    const size = petSize(pet);
    const side = pos.x < size * .6 ? 1 : pos.x + size * 1.65 > bounds.width || pet.facing >= 5 ? -1 : 1;
    pet.nextBurstAt = now + 1000;
    pet.cue = undefined;
    const breath = action === 'fire' ? pet.species.motions?.fireBreath : undefined;
    if (!pet.sideWalk) {
      pet.state.transition('idle');
      if (!breath) pet.behavior.react();
    }
    if (breath) {
      pet.firePending = true;
      cue(pet, 'fireBreath', now, side);
      return;
    }
    if (action === 'fire') pet.facing = side < 0 ? 6 : 2;
    effects.burst(action, {
      x: pos.x + size * (action === 'fire' ? side < 0 ? .26 : .74 : .5),
      y: pos.y + size * (action === 'fire' ? .42 : action === 'ink' ? .5 : .27),
    }, side, now);
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (!event.shiftKey) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit();
    if (pet) petMenu.open(pointer, hasToy(pet), toyEnabled);
  });
  window.addEventListener('blur', release);

  function bodyBounds(pet: Companion, position: Vec2): Rect {
    const size = petSize(pet);
    const frame = pet.animation.getCurrentFrameRect(pet.facing);
    const box = pet.clip?.pixelArt && frame ? renderer.getPaintBounds(pet.clip, frame, position, pet.species.behavior.spriteScale) :
      { x: position.x + size * 0.15, y: position.y + size * 0.15, width: size * 0.7, height: size * 0.85 };
    return { x: box.x + box.width * 0.08, y: box.y + box.height * 0.06, width: box.width * 0.84, height: box.height * 0.94 };
  }

  function collideWithPet(pet: Companion, flight: Flight, next: Flight, now: number, dt: number): boolean {
    if (pet.collisionPath === undefined) return false;
    const from = flight.position;
    const travel = { x: next.position.x - from.x, y: next.position.y - from.y };
    const body = bodyBounds(pet, from);
    let closest: { target: Companion; position: Vec2; wall?: -1 | 1; time: number; normal: Vec2 } | undefined;
    for (const target of pets) {
      if (target === pet || target.airborne || held?.pet === target) continue;
      const position = petPosition(target);
      const wall = wallSide(position, petSize(target), bounds.width, bounds.height);
      if (!canHitPet(pet.collisionPath, from, next.position, position, wall)) continue;
      const contact = petContact(body, travel, bodyBounds(target, position));
      if (contact && (!closest || contact.time < closest.time)) closest = { target, position, wall, ...contact };
    }
    if (!closest) return false;

    const { target, position, wall, time, normal } = closest;
    const side = normal.x !== 0 ? (normal.x < 0 ? 1 : -1) : (wall ?? (position.x < from.x ? -1 : 1));
    const incoming = { x: flight.velocity.x, y: flight.velocity.y + 1350 * dt * time };
    const response = petRebound(incoming, normal, side, wall);
    const strength = Math.min(1, response.speed / 920);
    pet.airborne = { position: { x: from.x + travel.x * time, y: from.y + travel.y * time }, velocity: response.source };
    pet.impactSpeed = Math.max(pet.impactSpeed, response.speed);
    pet.impactSide = side;
    cue(pet, 'petBump', now, side, strength);

    hush(target);
    target.state.transition('idle');
    target.behavior.interruptForDrag();
    target.sideWalk = undefined;
    target.airborne = { position, velocity: response.target };
    target.collisionPath = wall;
    target.throwSpeed = 0;
    target.impactSpeed = response.speed * 0.7;
    target.impactSide = wall ?? side;
    cue(target, 'petBump', now, side, strength * 0.7);
    return true;
  }

  function simulateFlight(pet: Companion, now: number, delta: number) {
    if (!pet.airborne || held?.pet === pet) return;
    if (pet.cue?.key === 'petBump') {
      const recoilUntil = Math.min(pet.cue.end, pet.cue.start + 45 + pet.cue.strength * 40);
      if (now < recoilUntil) return;
      if (now >= pet.cue.end) {
        const wall = pet.collisionPath;
        cue(pet, typeof wall === 'number' ? 'wallFall' : 'fly', now, pet.impactSide);
      }
    }
    if (pet.cue?.key === 'wallImpact') {
      if (now < pet.cue.end) return;
      cue(pet, 'wallFall', now, pet.impactSide);
    }
    const size = petSize(pet);
    const maxY = Math.max(0, bounds.height - size);
    const dt = delta / 1000;
    const next = advanceFlight(pet.airborne, dt, Math.max(0, bounds.width - size), maxY);
    if (collideWithPet(pet, pet.airborne, next, now, dt)) return;
    pet.airborne = next;
    if (next.wall && next.wallSpeed >= pet.impactSpeed) {
      pet.impactSide = next.wall === 'left' ? -1 : 1;
      pet.impactSpeed = next.wallSpeed;
      pet.facing = pet.impactSide < 0 ? 6 : 2;
      cue(pet, 'wallImpact', now, pet.impactSide, Math.min(1, next.wallSpeed / 920));
      if (next.wallSpeed > 460) reactWithLine(pet, 'bump', now);
      if (next.landed) {
        pet.airborne = { position: next.position, velocity: { x: 0, y: next.landingSpeed } };
        return;
      }
    }
    if (next.landed) {
      pet.behavior.setPosition({ x: floorX(next.position.x, size), y: 0 });
      pet.airborne = undefined;
      pet.collisionPath = undefined;
      const severity = Math.max(pet.impactSpeed, next.landingSpeed);
      const reaction = landingReaction(pet.throwSpeed, next.landingSpeed, pet.impactSpeed);
      pet.impactSpeed = severity;
      cue(pet, 'land', now, pet.impactSide, Math.min(reaction === 'playful' ? 0.3 : 1, severity / 920));
      if (reaction === 'hurt') {
        pet.state.transition('hurt');
        reactWithLine(pet, 'landing', now);
      } else if (reaction === 'playful') {
        reactWithLine(pet, 'playful', now);
      }
    }
  }

  function finishCue(pet: Companion, now: number) {
    const active = pet.cue;
    if (!active || pet.airborne || pet.toyPlay || now < active.end) return;
    pet.cue = undefined;
    if (active.key === 'land' && pet.state.getState() === 'hurt') cue(pet, 'ouch', now, active.side);
    else if (active.key === 'land' || active.key === 'ouch') cue(pet, 'recover', now, active.side);
    else if (active.key === 'recover') pet.behavior.resumeAfterDrag();
  }

  function playWithToy(pet: Companion, now: number, delta: number): boolean {
    const clips = pet.species.motions;
    if (!clips?.toyWatch || !clips.toyPounce || held?.pet === pet || pet.airborne || !hasToy(pet)) return false;
    const play = pet.toyPlay;
    const size = petSize(pet);
    const floor = Math.max(0, bounds.height - size);
    const maxX = Math.max(0, bounds.width - size);
    const xInBounds = (x: number) => Math.min(maxX, Math.max(0, x));
    const lure = fishingPose?.fish ?? toyPointer;
    const strikeAt = (aim: Vec2, side: -1 | 1): Vec2 => ({
      x: xInBounds(aim.x - size * (side < 0 ? 0.22 : 0.78)),
      y: Math.max(0, Math.min(floor - 12, aim.y - size * 0.54)),
    });
    if (play && pet.cue) {
      const active = pet.cue;
      if (active.key === 'toyWatch') {
        if (!toyEnabled || Math.abs(lure.x - play.origin.x - size / 2) > size * 1.4 || lure.y < floor - size * 1.1) {
          pet.toyPlay = undefined;
          pet.cue = undefined;
          return false;
        }
        play.side = lure.x < play.origin.x + size / 2 ? -1 : 1;
        play.aim = { ...lure };
        play.strike = strikeAt(lure, play.side);
        if (now >= active.end) cue(pet, 'toyPounce', now, play.side);
      }
      else if (active.key === 'toyPounce') {
        const p = Math.min(1, (now - active.start) / (active.end - active.start));
        const hitAt = 3 / 7;
        const travel = p <= hitAt ? p / hitAt : (1 - p) / (1 - hitAt);
        const easedY = Math.sin(travel * Math.PI / 2);
        play.position = { x: xInBounds(play.origin.x + (play.strike.x - play.origin.x) * Math.min(1, p / hitAt)),
          y: floor + (play.strike.y - floor) * easedY };
        if (!play.hit && p >= hitAt) {
          play.hit = true;
          if (toyEnabled && Math.hypot(lure.x - play.aim.x, lure.y - play.aim.y) <= size * 0.3) {
            if (pet.species.fishingToy) fishingRig.tap(play.side);
            else if (clips.toyRodHit) {
              toyProp = clips.toyRodHit;
              propAnimation.setAnimation(toyProp);
            }
          }
        }
        if (p === 1) {
          pet.behavior.setPosition({ x: play.position.x, y: 0 });
          cue(pet, 'toyLand', now, play.side);
        }
      } else if (active.key === 'toyLand' && now >= active.end) cue(pet, 'toyAfter', now, play.side);
      else if (active.key === 'toyAfter' && now >= active.end) {
        pet.toyPlay = undefined;
        pet.cue = undefined;
        pet.behavior.resumeAfterDrag();
        toyNextPlayAt = now + 1450;
      }
      return true;
    }
    if (!toyEnabled || pet.cue || resting(pet) || now < toyNextPlayAt) return false;
    const from = petPosition(pet);
    const cursor = lure;
    const dx = cursor.x - (from.x + size / 2);
    if (from.y < floor - 1 || cursor.x < 0 || cursor.x > bounds.width ||
        cursor.y < Math.max(0, floor - size * 1.1) || cursor.y > bounds.height || Math.abs(dx) > size * 3.5) return false;
    const side = dx < 0 ? -1 : 1;
    pet.facing = side < 0 ? 6 : 2;
    if (Math.abs(dx) > size * 0.98) {
      const step = Math.min(Math.abs(dx) - size * 0.85, delta * 0.115);
      const nextX = xInBounds(from.x + step * side);
      if (pet.state.getState() !== 'walk') {
        pet.state.transition('idle');
        pet.state.transition('walk');
      }
      pet.behavior.setPosition({ x: nextX, y: 0 });
      return true;
    }
    hush(pet);
    const strike = strikeAt(cursor, side);
    pet.toyPlay = { origin: from, position: from, strike, aim: { ...cursor }, side, hit: false };
    cue(pet, 'toyWatch', now, side);
    return true;
  }

  const pointerInArea = () => toyPointer.x >= 0 && toyPointer.y >= 0 && toyPointer.x <= bounds.width && toyPointer.y <= bounds.height;

  function updateToy(now: number, delta: number) {
    if (!toyEnabled) return;
    if (now >= nextCursorPoll && now - lastPointerAt > 90) {
      nextCursorPoll = now + 45;
      void window.petAPI.getCursorPoint().then((point) => {
        if (performance.now() - lastPointerAt > 90) toyPointer = point;
      });
    }
    const cat = toyOwner();
    fishingPose = cat?.species.fishingToy && pointerInArea()
      ? fishingRig.update(toyPointer, petSize(cat), bounds.width, bounds.height, delta) : undefined;
  }

  function renderToy(delta: number) {
    if (!toyEnabled || !pointerInArea()) return;
    const cat = toyOwner();
    if (cat?.species.fishingToy && fishingPose) {
      renderer.renderFishingRig(cat.species.fishingToy, fishingPose);
      return;
    }
    const idle = cat?.species.motions?.toyRod;
    if (!cat || !idle) return;
    if (!toyProp || propAnimation.isFinished()) {
      toyProp = idle;
      propAnimation.setAnimation(idle);
    }
    propAnimation.update(delta);
    const frame = propAnimation.getCurrentFrameRect();
    if (!frame) return;
    const size = petSize(cat);
    renderer.render(toyProp, frame, { x: toyPointer.x - size * 0.91, y: toyPointer.y - size * 0.92 }, cat.species.behavior.spriteScale);
  }

  function cueForMovement(pet: Companion, now: number, after: Vec2, previousState: PetState, reachedSide: -1 | 1 | undefined) {
    const state = pet.state.getState();
    const personality = personalityOf(pet.species);
    const size = petSize(pet);
    const onFloor = after.y >= bounds.height - size - 0.5;
    const side = after.x < bounds.width / 2 ? -1 : 1;
    if (state === 'sleep') {
      hush(pet);
      if (previousState === 'walk' && personality === 'relaxed' && onFloor) cue(pet, 'doze', now, side);
      return;
    }
    if (previousState === 'sleep') {
      cue(pet, 'wake', now, side);
      return;
    }
    if (reachedSide && state === 'walk' && onFloor && !toyEnabled &&
        pet.species.motions?.frontWalk && pet.species.motions.backWalk && after.y >= 32) {
      const speed = Math.max(25, pet.species.behavior.walkSpeedPxPerSec);
      pet.sideWalk = { side: reachedSide, elapsed: 0, legMs: after.y * SIDE_WALK_HEIGHT_RATIO / speed * 1000 };
      return;
    }
    const distance = Math.hypot(pointer.x - after.x - size / 2, pointer.y - after.y - size / 2);
    const closer = Number.isFinite(pet.pointerDistance) ? pet.pointerDistance - distance : 0;
    pet.pointerDistance = distance;
    if (state !== 'idle' || !onFloor) return;
    const settledProfile = pet.species.motions?.sideIdle && (pet.facing === 2 || pet.facing === 6);
    if ((!settledProfile || now - lastPointerAt <= 120) && now >= pet.nextLookAt && distance < size * 1.55 && closer > 3) {
      const looking = pointer.x < after.x + size / 2 ? -1 : 1;
      cue(pet, closer > 27 ? 'startle' : 'look', now, looking);
      pet.facing = looking < 0 ? 6 : 2;
      pet.nextLookAt = now + (personality === 'cautious' ? 2600 : 4400);
    } else if (!settledProfile && personality === 'curious' && now >= pet.nextCueAt) {
      cue(pet, 'curious', now, side);
      pet.nextCueAt = now + 10500;
    }
  }

  function encounter(now: number) {
    if (now < nextEncounter || held) return;
    const walkers = pets.filter((pet) => !pet.cue && !pet.airborne && !pet.sideWalk &&
      pet.state.getState() === 'walk' && now >= pet.speakingUntil);
    for (const a of walkers) {
      if (a.facing !== 2) continue;
      const left = petPosition(a);
      const b = walkers.find((other) => {
        const right = petPosition(other);
        const gap = right.x - left.x;
        return other.facing === 6 && gap > 0 && gap < (petSize(a) + petSize(other)) * 0.55 &&
          left.y + petSize(a) >= bounds.height - 1 && right.y + petSize(other) >= bounds.height - 1;
      });
      if (!b) continue;
      cue(a, 'meet', now, 1);
      cue(b, 'meet', now, -1);
      const yielding = personalityOf(a.species) === 'curious' ? a : b;
      yielding.behavior.turnAround();
      nextEncounter = now + 9000;
      return;
    }
  }

  function updateMouseTarget() {
    hoveredPet = hit();
    const capturingWheel = toyEnabled && pointerInArea() && !!toyOwner()?.species.fishingToy;
    const ignore = !held && !petMenu.isOpen && !capturingWheel && !emptyPaper.captures(pointer) && !hoveredPet;
    if (ignore !== clickThrough) { clickThrough = ignore; window.petAPI.setClickThrough(ignore); }
    canvas.classList.toggle('is-dragging', !!held?.dragging);
  }

  function followCursor(pet: Companion, delta: number) {
    if (pointer.x < 0 || pointer.y < 0 || pointer.x > bounds.width || pointer.y > bounds.height) {
      pet.state.transition('idle');
      return;
    }
    const size = petSize(pet);
    const target = floorX(pointer.x - size / 2, size);
    const distance = pet.behavior.getPosition().x;
    const gap = target - distance;
    if (Math.abs(gap) < 5) {
      pet.state.transition('idle');
      return;
    }
    if (pet.state.getState() !== 'walk') {
      pet.state.transition('idle');
      pet.state.transition('walk');
    }
    pet.behavior.setPosition({ x: distance + Math.sign(gap) * Math.min(Math.abs(gap), delta * .205), y: 0 });
  }

  function tick(now: number) {
    bounds.width = window.innerWidth; bounds.height = window.innerHeight;
    const delta = Math.min(now - previous, 100); previous = now;
    renderer.clear();
    const empty = sceneReady && pets.length === 0;
    emptyPaper.update(empty, petMenu.isOpen, bounds.width, bounds.height, delta);
    // Forwarded movement can be missed when a pet walks under a stationary cursor
    // or the cursor leaves the whole work area from an interactive pet.
    if (sceneReady && pollPointer() && !document.hidden && now >= nextPointerPoll && now - lastPointerAt > 90) {
      nextPointerPoll = now + 60;
      void window.petAPI.getCursorPoint().then((point) => {
        if (!pollPointer() || performance.now() - lastPointerAt <= 90) return;
        pointer = point;
        updateMouseTarget();
      }).catch(() => {});
    }
    updateToy(now, delta);
    const heldAnimation = held?.pet.species.animations.dragged;
    if (held && !held.dragging && now - held.since >= 200 && (heldAnimation?.motion === 'wriggle' || heldAnimation?.authoredGrip)) {
      beginDrag(held);
      positionHeld(held);
    }
    if (reply && now >= reply.at) { say(reply.pet, reply.text, now); reply = null; }
    if (pendingSchedule && now >= pendingSchedule.expires) pendingSchedule = null;
    if (pendingSchedule && !petMenu.isOpen && !reply && !document.hidden) {
      const speaker = pets.find((pet) => now >= pet.until && canChat(pet, now));
      if (speaker) {
        say(speaker, pendingSchedule.text, now, false);
        pendingSchedule = null;
        schedule();
      }
    }
    if (chatter?.enabled && pets.length && now >= nextChat && !held && !reply) {
      const available = pets.filter((pet) => canChat(pet, now));
      if (available.length > 1 && Math.random() < 0.55) converse(available[0], available[1], now);
      else if (available.length) talkToUser(random(available), now);
      if (available.length) schedule();
      else nextChat = now + 1500;
    }
    encounter(now);
    for (const pet of pets) {
      finishCue(pet, now);
      const scale = pet.species.behavior.spriteScale;
      const before = petPosition(pet);
      const previousState = pet.state.getState();
      if (pet.airborne) simulateFlight(pet, now, delta);
      else if (pet.sideWalk) {
        const walk = pet.sideWalk;
        if (held?.pet !== pet && !pet.cue) walk.elapsed += delta;
        if (walk.elapsed >= walk.legMs * 2) {
          pet.behavior.setPosition({ x: floorX(walk.side < 0 ? 0 : bounds.width, petSize(pet)), y: 0 });
          pet.sideWalk = undefined;
        }
      } else if (pet.chasing && held?.pet !== pet) {
        followCursor(pet, delta);
      } else if (playWithToy(pet, now, delta)) { /* Toy pose drives position while active. */ }
      else if (held?.pet !== pet && !pet.cue && now >= pet.speakingUntil) {
        const size = petSize(pet);
        const reachedSide = pet.behavior.update(delta, { x: 0, y: 0, width: Math.max(bounds.width, size), height: bounds.height }, size);
        cueForMovement(pet, now, petPosition(pet), previousState, reachedSide);
      }
      const after = petPosition(pet);
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      if (pet.toyPlay) pet.facing = pet.toyPlay.side < 0 ? 6 : 2;
      else if (pet.cue?.key === 'fireBreath') pet.facing = pet.cue.side < 0 ? 6 : 2;
      else if (pet.cue?.key === 'wallImpact' || pet.cue?.key === 'wallFall') pet.facing = pet.cue.side < 0 ? 6 : 2;
      else if (Math.abs(dx) > Math.max(0.01, Math.abs(dy))) pet.facing = dx < 0 ? 6 : 2;
      else if (Math.abs(dy) > 0.01) pet.facing = dy < 0 ? 4 : 0;
      const state = pet.state.getState();
      const sideMotion = pet.sideWalk && !pet.cue ?
        pet.sideWalk.elapsed < pet.sideWalk.legMs ? 'backWalk' : 'frontWalk' : undefined;
      const sideIdle = (state === 'idle' || state === 'sit') && (pet.facing === 2 || pet.facing === 6) && pet.species.motions?.sideIdle;
      if (sideMotion) pet.facing = sideMotion === 'backWalk' ? 4 : 0;
      const playback = sideMotion ?? pet.cue?.key ?? (sideIdle ? 'sideIdle' : state);
      const def = (sideMotion && pet.species.motions?.[sideMotion]) ||
        (pet.cue ? cueAnimation(pet.species, pet.cue, pet.facing) : sideIdle || animationFor(pet.species, state));
      if (!def) continue;
      if (pet.playbackKey !== playback) {
        pet.clip = def;
        pet.playbackKey = playback;
        pet.animation.setAnimation(def);
      } else pet.animation.update(held?.pet === pet && held.dragging ? delta * 0.48 : delta);
      if (!pet.cue && pet.state.getState() === 'react' && pet.animation.isFinished()) pet.behavior.endReaction();
      const frame = pet.animation.getCurrentFrameRect(pet.facing);
      const pose = currentPose(pet, now);
      const leftSheet = pet.facing >= 5 ? def.leftSheet : undefined;
      const mirror = !leftSheet && (def.mirrorWhen === 'left' ? pet.facing >= 5 : def.mirrorWhen === 'right' && pet.cue?.side === 1);
      const view = leftSheet ? { ...def, sheet: leftSheet } : def;
      const pos = after;
      if (frame) renderer.render(view, frame, pos, scale,
        held?.pet === pet && held.dragging ? held.offset : undefined, pose, petSize(pet), mirror);
      if (pet.cue?.key === 'fireBreath' && pet.firePending) {
        const mouth = pet.species.behavior.fireMouth ?? { x: .74, y: .42, frame: 1 };
        if (pet.animation.currentFrameIndex >= mouth.frame) {
          const side = pet.cue.side;
          const size = petSize(pet);
          effects.burst('fire', {
            x: pos.x + size * (side < 0 ? 1 - mouth.x : mouth.x),
            y: pos.y + size * mouth.y,
          }, side, now);
          pet.firePending = false;
        }
      }
      pet.bubble.hidden = resting(pet) || now >= pet.until;
      const head = frame && pose ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize(pet)).y :
        frame && def.pixelArt ? renderer.getPaintBounds(def, frame, pos, scale).y : pos.y;
      const bubbleWidth = pet.bubble.offsetWidth || 190;
      pet.bubble.style.left = `${Math.max(4, Math.min(bounds.width - bubbleWidth - 4, pos.x + petSize(pet) / 2 - bubbleWidth / 2))}px`;
      pet.bubble.style.top = `${Math.max(4, head - pet.bubble.offsetHeight - 4)}px`;
    }
    renderToy(delta);
    effects.draw(now);
    if (chatter?.enabled && now >= nextMeeting && !reply && !held) {
      for (let i = 0; i < pets.length; i++) {
        const a = pets[i]; const b = pets.slice(i + 1).find((other) =>
          Math.abs(petPosition(a).x - petPosition(other).x) < 210 &&
          Math.abs(petPosition(a).y - petPosition(other).y) < 100);
        if (b && now > a.until && now > b.until) { converse(a, b, now); break; }
      }
    }
    updateMouseTarget();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
void main();
