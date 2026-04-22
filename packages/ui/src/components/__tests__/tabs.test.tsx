import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs.js';

afterEach(() => {
  cleanup();
});

describe('Tabs', () => {
  it('renders tab triggers', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
        <TabsContent value="b">B content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'A' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'B' })).toBeDefined();
  });

  it('shows only the default tab content initially', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
        <TabsContent value="b">B content</TabsContent>
      </Tabs>
    );
    expect(screen.getByText('A content')).toBeDefined();
    expect(screen.queryByText('B content')).toBeNull();
  });

  it('selected tab trigger carries aria-selected="true"', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true');
  });
});
