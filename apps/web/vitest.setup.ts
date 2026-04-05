import { vi } from 'vitest';
import React from 'react';
import messages from './messages/en.json';

type MessageObj = Record<string, unknown>;

function getNamespaceMessages(namespace: string): MessageObj {
  const parts = namespace.split('.');
  let current: unknown = messages;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as MessageObj)[part];
    } else {
      return {};
    }
  }
  return (typeof current === 'object' && current !== null ? current : {}) as MessageObj;
}

function interpolate(template: string, values: MessageObj = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

function parseRichText(template: string, values: MessageObj = {}): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = template;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const tagMatch = remaining.match(/^([\s\S]*?)<(\w+)>([\s\S]*?)<\/\2>/);
    if (!tagMatch) {
      parts.push(interpolate(remaining, values));
      break;
    }
    const [fullMatch, before, tagName, innerContent] = tagMatch as [string, string, string, string];
    if (before) parts.push(interpolate(before, values));

    const tagFn = values[tagName];
    const inner = interpolate(innerContent, values);
    if (typeof tagFn === 'function') {
      parts.push(React.createElement(React.Fragment, { key: keyIndex++ }, tagFn(inner)));
    } else {
      parts.push(inner);
    }
    remaining = remaining.slice(fullMatch.length);
  }

  return parts.length === 1 ? parts[0] : React.createElement(React.Fragment, null, ...parts);
}

function makeTranslator(namespace: string) {
  const ns = getNamespaceMessages(namespace);

  function resolve(key: string): string | undefined {
    const parts = key.split('.');
    let current: unknown = ns;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = (current as MessageObj)[part];
      } else {
        return undefined;
      }
    }
    return typeof current === 'string' ? current : undefined;
  }

  function t(key: string, values?: MessageObj): string {
    const template = resolve(key);
    if (template === undefined) return key;
    const plain = template.replace(/<\w+>([\s\S]*?)<\/\w+>/g, '$1');
    return values ? interpolate(plain, values) : plain;
  }

  t.rich = (key: string, values?: MessageObj): React.ReactNode => {
    const template = resolve(key);
    if (template === undefined) return key;
    return parseRichText(template, values);
  };

  return t;
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => makeTranslator(namespace),
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions?: string | { namespace?: string }) => {
    const ns =
      typeof namespaceOrOptions === 'string'
        ? namespaceOrOptions
        : (namespaceOrOptions?.namespace ?? '');
    return makeTranslator(ns);
  },
  getLocale: async () => 'en',
}));
