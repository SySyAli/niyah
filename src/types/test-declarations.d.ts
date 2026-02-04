// Type declarations for test dependencies
declare module "react-test-renderer" {
  import { ReactElement } from "react";

  interface TestRendererJSON {
    type: string;
    props: Record<string, unknown>;
    children: null | TestRendererJSON[];
  }

  interface TestInstance {
    type: string | Function;
    props: Record<string, unknown>;
    parent: TestInstance | null;
    children: Array<TestInstance | string>;
    find(predicate: (node: TestInstance) => boolean): TestInstance;
    findByType(type: Function | string): TestInstance;
    findByProps(props: Record<string, unknown>): TestInstance;
    findAll(predicate: (node: TestInstance) => boolean): TestInstance[];
    findAllByType(type: Function | string): TestInstance[];
    findAllByProps(props: Record<string, unknown>): TestInstance[];
  }

  interface TestRenderer {
    toJSON(): TestRendererJSON | null;
    toTree(): unknown;
    unmount(): void;
    update(element: ReactElement): void;
    getInstance(): unknown;
    root: TestInstance;
  }

  export function create(element: ReactElement): TestRenderer;
  export function act(callback: () => void | Promise<void>): void;

  export default {
    create,
    act,
  };
}
