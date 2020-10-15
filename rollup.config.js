import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace";

const tsOpts = { useTsconfigDeclarationDir: true };
const terserOpts = {
  compress: {
    keep_infinity: true,
    pure_getters: true,
    passes: 10,
  },
  ecma: 9,
  toplevel: true,
  warnings: true,
  mangle: {
    properties: {
      regex: "^_",
    },
  },
  nameCache: {
    props: {
      cname: 6,
      props: {
        // Component
        $_hooks: "_h",
        $_performUpdate: "_u",
        $_flushEffects: "_f",
        $_attr: "_a",
        $_observeAttr: "_o",
        $_dispatch: "_d",
        $_adoptStyle: "_s",
        $_context: "_c",
        // hooks
        $_values: "_v",
        $_deps: "_d",
        $_effects: "_e",
        $_layoutEffects: "_l",
        $_cleanup: "_c",
      },
    },
  },
};

const bundle = (moduleName, external = []) => {
  const plugins = [
    typescript(tsOpts),
    replace({ "process.env.BUILD_ENV": JSON.stringify("development") }),
  ];
  return [
    {
      input: `./src/${moduleName}/index.ts`,
      output: {
        file: `esm/${moduleName}.development.js`,
        format: "esm",
      },
      plugins,
      external,
    },
    {
    input: `./src/${moduleName}/index.ts`,
    output: {
      file: `esm/${moduleName}.production.js`,
      format: "esm",
      plugins: [terser(terserOpts)],
    },
    plugins,
    external,
  }];
};

export default [
  ...bundle("fuco", ["../html"]),
  ...bundle("html"),
  ...bundle("server", ["../html", "../fuco"]),
];
