import { Component } from "./component";
import { Context } from "./context";
import { Provider } from "./provider";

type Option<T> = T | undefined;

type Callback<Arg = void, Return = void> = (arg: Arg) => Return;

export interface Hook {
  value?: any;
  cleanup?: any;
}

export interface AttributeHook extends Hook {
  value?: string;
  cleanup?: () => void;
}

export interface PropertyHook<T> extends Hook {
  value?: T;
}

export interface DispatchHook<T> extends Hook {
  dispatch(detail: T): void;
}

export interface QueryHook<T extends Element | NodeListOf<Element>>
  extends Hook {
  value?: {
    readonly current: T | null;
  };
}

type SetState<T> = (value: T | Callback<T, T>) => void;

export interface StateHook<T> extends Hook {
  value?: T;
  setter?: SetState<T>;
}

export interface ReducerHook<S, A> extends Hook {
  value?: S;
  dispatch?: (action: A) => void;
}

export interface ContextHook<T> extends Hook {
  provider: Provider<T>;
  cleanup: () => void;
}

export interface EffectHook extends Hook {
  handler?: () => Callback | void;
  fields?: any[];
  cleanup?: Callback;
}

export interface MemoHook<T> extends Hook {
  value?: T;
  fields?: any[];
}

export interface ErrorHook extends Hook {
  value?: Error;
  called?: boolean;
}

let currentCursor: number;
let currentElement: Component;

export function setCurrent(el: Component, cursor: number) {
  currentElement = el;
  currentCursor = cursor;
}

function getHook() {
  while (currentElement.hooks.length <= currentCursor) {
    currentElement.hooks.push({});
  }
  return currentElement.hooks[currentCursor++];
}

const fieldsChanged = (prev: any[] | undefined, next: any[]) =>
  prev == null || next.some((f, i) => f !== prev[i]);

export const useAttribute = (name: string) => {
  const hook = getHook() as AttributeHook;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = el.getAttribute(name) || "";
    const m = new MutationObserver(() => {
      hook.value = el.getAttribute(name) || "";
      el.update();
    });
    m.observe(el, { attributes: true, attributeFilter: [name] });
    hook.cleanup = () => m.disconnect();
  }
  return hook.value;
};

export const useProperty = <T>(name: string) => {
  const hook = getHook() as PropertyHook<T>;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = (el as any)[name];
    Object.defineProperty(el, name, {
      get() {
        return hook.value;
      },
      set(newValue) {
        hook.value = newValue;
        el.update();
      }
    });
  }
  return hook.value;
};

export const useDispatchEvent = <T>(
  name: string,
  init: CustomEventInit = {}
) => {
  const hook = getHook() as DispatchHook<T>;
  const el = currentElement;
  if (!hook.dispatch) {
    hook.dispatch = (detail: T) =>
      el.dispatchEvent(
        new CustomEvent(name, {
          ...init,
          detail
        })
      );
  }
  return hook.dispatch;
};

export const useQuery = <T extends Element>(selector: string) => {
  const hook = getHook() as QueryHook<T>;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = {
      get current() {
        return el.rootElement.querySelector<T>(selector);
      }
    };
  }
  return hook.value;
};

export const useQueryAll = <T extends Element>(selector: string) => {
  const hook = getHook() as QueryHook<NodeListOf<T>>;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = {
      get current() {
        return el.rootElement.querySelectorAll<T>(selector);
      }
    };
  }
  return hook.value;
};

export const useState = <T>(initValue: T): [T, SetState<T>] => {
  const hook = getHook() as StateHook<T>;
  const el = currentElement;
  if (hook.value == null || hook.setter == null) {
    hook.value = initValue;
    hook.setter = function(newValue) {
      if (typeof newValue === "function") {
        newValue = (newValue as Callback<Option<T>, T>)(hook.value);
      }
      hook.value = newValue;
      el.update();
    };
  }
  return [hook.value, hook.setter];
};

const initAction = { type: "__@@init__" };

export const useReducer = <S, A>(
  reducer: (state: Option<S>, action: A | typeof initAction) => S,
  initialState: S
): [S, (action: A) => void] => {
  const hook = getHook() as ReducerHook<S, A>;
  const el = currentElement;
  if (hook.value == null || hook.dispatch == null) {
    hook.value = reducer(initialState, initAction);
    hook.dispatch = (action: A) => {
      hook.value = reducer(hook.value, action);
      el.update();
    };
  }
  return [hook.value, hook.dispatch];
};

export const useContext = <T>(context: Context): T => {
  const el = currentElement;
  let hook = el.contexts.get(context);
  if (!hook) el.contexts.set(context, (hook = getHook() as ContextHook<T>));

  if (!hook.provider) {
    el.dispatchRequestConsume(context);
  }
  return hook.provider.value;
};

export const useEffect = (
  handler: () => Callback | void,
  fields: any[] = []
) => {
  const hook = getHook() as EffectHook;
  const el = currentElement;
  if (fieldsChanged(hook.fields, fields)) {
    hook.fields = fields;
    hook.handler = handler;
    el.effects.push(hook);
  }
};

export const useMemo = <T>(fn: Callback<void, T>, fields: any[] = []) => {
  const hook = getHook() as MemoHook<T>;
  if (fieldsChanged(hook.fields, fields)) {
    hook.fields = fields;
    hook.value = fn();
  }
  return hook.value;
};

export const useCallback = <A, R>(
  callback: Callback<A, R>,
  fields: any[] = []
) => useMemo(() => callback, fields);

export const useErrorBoundary = () => {
  const hook = getHook() as ErrorHook;
  const el = currentElement;
  if (!hook.called) {
    hook.called = true;
    el.subscribeErrorEvent(e => {
      e.stopPropagation();
      hook.value = e.detail.error;
      el.update();
    });
  }
  return hook.value;
};
