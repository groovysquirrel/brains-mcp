import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
//import { signOut } from 'aws-amplify/auth'
import { ThemeProvider, StyledEngineProvider, createTheme } from '@mui/material'
import { CssBaseline } from '@mui/material'
import App from './App'
import config from './config'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

// Blueprint CSS imports
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import 'react-mosaic-component/react-mosaic-component.css';

// Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.cognito.USER_POOL_ID,
      userPoolClientId: config.cognito.APP_CLIENT_ID,
      identityPoolId: config.cognito.IDENTITY_POOL_ID,
    }
  },
  API: {
    REST: {
      "brainsOS": {
        endpoint: config.apiGateway.URL,
        region: config.apiGateway.REGION,
      },
    },
  },
})

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          height: '100vh',
          overflow: 'hidden'
        }
      }
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Authenticator.Provider>
            <App />
          </Authenticator.Provider>
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
)
