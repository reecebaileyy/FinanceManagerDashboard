const config = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,mdx,css,scss,html}': ['prettier --write'],
};

export default config;
