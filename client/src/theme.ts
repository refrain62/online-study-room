import { createTheme } from '@mui/material/styles';

/**
 * Material-UIのテーマを定義します。
 * アプリケーション全体で使用される色やタイポグラフィなどのスタイルを設定します。
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: '#red',
    },
  },
});

export default theme;

