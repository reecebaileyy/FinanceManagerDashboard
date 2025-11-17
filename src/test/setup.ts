export {};

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  const { SharedArrayBuffer: NodeSharedArrayBuffer } = await import('node:worker_threads');

  if (NodeSharedArrayBuffer) {
    globalThis.SharedArrayBuffer = NodeSharedArrayBuffer as typeof globalThis.SharedArrayBuffer;
  }
}

const ReactGlobal = await import('react');

if (typeof (globalThis as Record<string, unknown>).React === 'undefined') {
  (globalThis as Record<string, unknown>).React = ReactGlobal;
}

if (typeof CSSStyleDeclaration !== 'undefined') {
  const cssPrototype = CSSStyleDeclaration.prototype as unknown as {
    setProperty: CSSStyleDeclaration['setProperty'];
  };
  const originalSetProperty = cssPrototype.setProperty as (
    this: CSSStyleDeclaration,
    propertyName: string,
    value: string,
    priority?: string,
  ) => void;

  const normalizePropertyName = (propertyName: string) =>
    propertyName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).toLowerCase();

  const borderFallbacks = new Map<string, string>([
    ['border', '0px solid transparent'],
    ['border-top', '0px solid transparent'],
    ['border-right', '0px solid transparent'],
    ['border-bottom', '0px solid transparent'],
    ['border-left', '0px solid transparent'],
    ['border-width', '0px'],
    ['border-top-width', '0px'],
    ['border-right-width', '0px'],
    ['border-bottom-width', '0px'],
    ['border-left-width', '0px'],
    ['border-style', 'none'],
    ['border-top-style', 'none'],
    ['border-right-style', 'none'],
    ['border-bottom-style', 'none'],
    ['border-left-style', 'none'],
    ['border-color', 'transparent'],
    ['border-top-color', 'transparent'],
    ['border-right-color', 'transparent'],
    ['border-bottom-color', 'transparent'],
    ['border-left-color', 'transparent'],
    ['border-image', 'none'],
  ]);

  const sanitizeBorderValue = (propertyName: string) => {
    const normalized = normalizePropertyName(propertyName);
    return borderFallbacks.get(normalized) ?? '0px solid transparent';
  };

  const shouldSanitizeBorderValue = (value: unknown): value is string =>
    typeof value === 'string' && value.includes('var(');

  const borderCssProperties = [
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-style',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-image',
  ];

  const clearBorderValues = (style: CSSStyleDeclaration) => {
    for (const property of borderCssProperties) {
      style.removeProperty(property);
    }
  };

  const applyOriginalSetProperty = (
    style: CSSStyleDeclaration,
    propertyName: string,
    nextValue: string,
    priority?: string,
  ) => Reflect.apply(originalSetProperty, style, [propertyName, nextValue, priority]);

  cssPrototype.setProperty = function patchedSetProperty(
    propertyName: string,
    value: string,
    priority?: string,
  ) {
    const style = this as CSSStyleDeclaration;
    if (
      typeof propertyName === 'string' &&
      propertyName.startsWith('border') &&
      shouldSanitizeBorderValue(value)
    ) {
      clearBorderValues(style);
      return applyOriginalSetProperty(
        style,
        propertyName,
        sanitizeBorderValue(propertyName),
        priority,
      );
    }
    try {
      return applyOriginalSetProperty(style, propertyName, value, priority);
    } catch (error) {
      if (
        error instanceof TypeError &&
        typeof propertyName === 'string' &&
        propertyName.startsWith('border') &&
        shouldSanitizeBorderValue(value)
      ) {
        clearBorderValues(style);
        return applyOriginalSetProperty(
          style,
          propertyName,
          sanitizeBorderValue(propertyName),
          priority,
        );
      }
      throw error;
    }
  };

  const patchBorderProperty = (propertyName: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(cssPrototype, propertyName);

    if (!descriptor || typeof descriptor.set !== 'function') {
      return;
    }
    const callOriginalSetter = (style: CSSStyleDeclaration, nextValue: unknown) =>
      descriptor.set!.call(style, nextValue);
    const callOriginalGetter: ((style: CSSStyleDeclaration) => unknown) | undefined = descriptor.get
      ? (style: CSSStyleDeclaration) => descriptor.get!.call(style) as unknown
      : undefined;

    const patchedDescriptor: PropertyDescriptor = {
      configurable: descriptor.configurable ?? true,
      enumerable: descriptor.enumerable ?? false,
    };

    if (callOriginalGetter) {
      patchedDescriptor.get = function patchedBorderGetter(this: CSSStyleDeclaration) {
        return callOriginalGetter(this);
      };
    }

    patchedDescriptor.set = function patchedBorderSetter(
      this: CSSStyleDeclaration,
      value: unknown,
    ) {
      if (shouldSanitizeBorderValue(value)) {
        clearBorderValues(this);
        callOriginalSetter(this, sanitizeBorderValue(propertyName));
        return;
      }
      try {
        callOriginalSetter(this, value);
      } catch (error) {
        if (error instanceof TypeError && shouldSanitizeBorderValue(value)) {
          clearBorderValues(this);
          callOriginalSetter(this, sanitizeBorderValue(propertyName));
          return;
        }
        throw error;
      }
    };

    Object.defineProperty(cssPrototype, propertyName, patchedDescriptor);
  };

  const borderProperties = [
    'border',
    'borderTop',
    'borderRight',
    'borderBottom',
    'borderLeft',
    'borderWidth',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'borderTopStyle',
    'borderRightStyle',
    'borderBottomStyle',
    'borderLeftStyle',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderImage',
    'border-image',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-style',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
  ];

  for (const propertyName of borderProperties) {
    patchBorderProperty(propertyName);
  }
}

// Extend here with shared test utilities/mocks as the test suite grows.
