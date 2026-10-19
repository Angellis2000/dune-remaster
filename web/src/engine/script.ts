/**
 * Виртуальная машина скриптов Westwood EMC (OpenDUNE src/script/script.c).
 * Байт-код и точки входа берутся из ROM (FORM EMC2), функции — из таблиц
 * scriptUnit/scriptStructure/scriptTeam в том же порядке, что у PC-версии.
 */
import { G, s8, s16, u16, type ScriptEngine, type ScriptInfo } from "./core.ts";
import {customScriptType} from './custom-unit-defs.ts';

const OPCODES_PER_TICK = 50;
export { OPCODES_PER_TICK as SCRIPT_UNIT_OPCODES_PER_TICK };

function scriptError(script: ScriptEngine, msg: string): void {
  const o = G.scriptCurrentObject;
  console.warn(`[SCRIPT] ${msg}; объект ${o?.index ?? "?"} тип ${o?.type ?? "?"}`);
  script.pc = -1;
}

export function push(script: ScriptEngine, value: number): void {
  if (script.stackPointer === 0) {
    scriptError(script, "переполнение стека");
    return;
  }
  script.stack[--script.stackPointer] = u16(value);
}

export function pop(script: ScriptEngine): number {
  if (script.stackPointer >= 15) {
    scriptError(script, "стек пуст");
    return 0;
  }
  return script.stack[script.stackPointer++];
}

/** STACK_PEEK(n): значение n-го элемента от вершины (1 — вершина). */
export function peek(script: ScriptEngine, position: number): number {
  if (script.stackPointer >= 16 - position) {
    scriptError(script, "выход за стек");
    return 0;
  }
  return script.stack[script.stackPointer + position - 1];
}

export function scriptReset(script: ScriptEngine, info: ScriptInfo | null): void {
  if (!info) return;
  script.pc = -1;
  script.scriptInfo = info;
  script.isSubroutine = 0;
  script.framePointer = 17;
  script.stackPointer = 15;
}

export function scriptLoad(script: ScriptEngine, typeID: number): void {
  const info = script.scriptInfo;
  if (!info) return;
  scriptReset(script, info);
  script.pc = info.offsets[info===G.scriptUnit?customScriptType(typeID):info===G.scriptStructure&&typeID===19?5:typeID];
}

export function scriptLoadAsSubroutine(script: ScriptEngine, typeID: number): void {
  if (!scriptIsLoaded(script)) return;
  if (script.isSubroutine !== 0) return;
  script.isSubroutine = 1;
  push(script, script.pc);
  push(script, script.returnValue);
  script.pc = script.scriptInfo!.offsets[script.scriptInfo===G.scriptUnit?customScriptType(typeID):script.scriptInfo===G.scriptStructure&&typeID===19?5:typeID];
}

export const scriptIsLoaded = (script: ScriptEngine): boolean => script.pc >= 0 && script.scriptInfo !== null;

export function scriptRun(script: ScriptEngine): boolean {
  if (!scriptIsLoaded(script)) return false;
  const info = script.scriptInfo!;
  const code = info.start;
  const current = code[script.pc++];
  let opcode = (current >> 8) & 0x1f;
  let parameter = 0;
  if (current & 0x8000) {
    opcode = 0;
    parameter = current & 0x7fff;
  } else if (current & 0x4000) {
    parameter = u16(s8(current & 0xff));
  } else if (current & 0x2000) {
    parameter = code[script.pc++];
  }

  switch (opcode) {
    case 0: // JUMP
      script.pc = parameter;
      return true;
    case 1: // SETRETURNVALUE
      script.returnValue = parameter;
      return true;
    case 2: // PUSH_RETURN_OR_LOCATION
      if (parameter === 0) {
        push(script, script.returnValue);
        return true;
      }
      if (parameter === 1) {
        push(script, script.pc + 1);
        push(script, script.framePointer);
        script.framePointer = script.stackPointer + 2;
        return true;
      }
      scriptError(script, `opcode 2: параметр ${parameter}`);
      return false;
    case 3: // PUSH
    case 4: // PUSH2
      push(script, parameter);
      return true;
    case 5: // PUSH_VARIABLE
      push(script, script.variables[parameter]);
      return true;
    case 6: { // PUSH_LOCAL_VARIABLE
      const i = script.framePointer - parameter - 2;
      if (i >= 15 || i < 0) {
        scriptError(script, "локальная переменная вне стека");
        return false;
      }
      push(script, script.stack[i]);
      return true;
    }
    case 7: { // PUSH_PARAMETER
      const i = script.framePointer + parameter - 1;
      if (i >= 15 || i < 0) {
        scriptError(script, "параметр вне стека");
        return false;
      }
      push(script, script.stack[i]);
      return true;
    }
    case 8: // POP_RETURN_OR_LOCATION
      if (parameter === 0) {
        script.returnValue = pop(script);
        return true;
      }
      if (parameter === 1) {
        peek(script, 2);
        if (script.pc < 0) return false;
        script.framePointer = pop(script) & 0xff;
        script.pc = pop(script);
        return true;
      }
      scriptError(script, `opcode 8: параметр ${parameter}`);
      return false;
    case 9: // POP_VARIABLE
      script.variables[parameter] = pop(script);
      return true;
    case 10: { // POP_LOCAL_VARIABLE
      const i = script.framePointer - parameter - 2;
      if (i >= 15 || i < 0) {
        scriptError(script, "локальная переменная вне стека");
        return false;
      }
      script.stack[i] = pop(script);
      return true;
    }
    case 11: { // POP_PARAMETER
      const i = script.framePointer + parameter - 1;
      if (i >= 15 || i < 0) {
        scriptError(script, "параметр вне стека");
        return false;
      }
      script.stack[i] = pop(script);
      return true;
    }
    case 12: // STACK_REWIND
      script.stackPointer = (script.stackPointer + parameter) & 0xff;
      return true;
    case 13: // STACK_FORWARD
      script.stackPointer = (script.stackPointer - parameter) & 0xff;
      return true;
    case 14: { // FUNCTION
      parameter &= 0xff;
      const fn = info.functions[parameter];
      if (!fn) {
        scriptError(script, `неизвестная функция ${parameter}`);
        return false;
      }
      script.returnValue = u16(fn(script));
      return true;
    }
    case 15: // JUMP_NE
      peek(script, 1);
      if (script.pc < 0) return false;
      if (pop(script) !== 0) return true;
      script.pc = parameter & 0x7fff;
      return true;
    case 16: // UNARY
      if (parameter === 0) push(script, pop(script) === 0 ? 1 : 0);
      else if (parameter === 1) push(script, -pop(script));
      else if (parameter === 2) push(script, ~pop(script));
      else {
        scriptError(script, `opcode 16: параметр ${parameter}`);
        return false;
      }
      return true;
    case 17: { // BINARY
      const right = s16(pop(script));
      const left = s16(pop(script));
      let r: number;
      switch (parameter) {
        case 0: r = left && right ? 1 : 0; break;
        case 1: r = left || right ? 1 : 0; break;
        case 2: r = left === right ? 1 : 0; break;
        case 3: r = left !== right ? 1 : 0; break;
        case 4: r = left < right ? 1 : 0; break;
        case 5: r = left <= right ? 1 : 0; break;
        case 6: r = left > right ? 1 : 0; break;
        case 7: r = left >= right ? 1 : 0; break;
        case 8: r = left + right; break;
        case 9: r = left - right; break;
        case 10: r = left * right; break;
        case 11: r = right === 0 ? 0 : Math.trunc(left / right); break;
        case 12: r = left >> right; break;
        case 13: r = left << right; break;
        case 14: r = left & right; break;
        case 15: r = left | right; break;
        case 16: r = right === 0 ? 0 : left % right; break;
        case 17: r = left ^ right; break;
        default:
          scriptError(script, `opcode 17: параметр ${parameter}`);
          return false;
      }
      push(script, r);
      return true;
    }
    case 18: // RETURN
      peek(script, 2);
      if (script.pc < 0) return false;
      script.returnValue = pop(script);
      script.pc = pop(script);
      script.isSubroutine = 0;
      return true;
    default:
      scriptError(script, `неизвестный опкод ${opcode}`);
      return false;
  }
}

/** Разбор FORM EMC2 из ROM: ORDR — точки входа, DATA — байт-код (big-endian слова). */
export function loadEmc(rom: Uint8Array, form: number, functions: ScriptInfo["functions"]): ScriptInfo {
  const rd32 = (o: number) => ((rom[o] << 24) | (rom[o + 1] << 16) | (rom[o + 2] << 8) | rom[o + 3]) >>> 0;
  const tag = (o: number) => String.fromCharCode(rom[o], rom[o + 1], rom[o + 2], rom[o + 3]);
  if (tag(form) !== "FORM" || tag(form + 8) !== "EMC2") throw new Error(`нет FORM EMC2 по адресу ${form.toString(16)}`);
  const end = form + 8 + rd32(form + 4);
  let o = form + 12;
  let offsets = new Uint16Array(0);
  let start = new Uint16Array(0);
  let text = new Uint8Array(0);
  while (o < end && /^[A-Z]{4}$/.test(tag(o))) {
    const id = tag(o);
    const len = rd32(o + 4);
    const words = new Uint16Array(len >> 1);
    for (let i = 0; i < words.length; i++) words[i] = (rom[o + 8 + i * 2] << 8) | rom[o + 9 + i * 2];
    if (id === "ORDR") offsets = words;
    else if (id === "DATA") start = words;
    else if (id === "TEXT") text = rom.slice(o + 8, o + 8 + len);
    o += 8 + len + (len & 1);
  }
  return { start, offsets, functions, text };
}
