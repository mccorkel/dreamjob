//import { useEffect, useState } from "react";
//import type { Schema } from "../amplify/data/resource";
//import { generateClient } from "aws-amplify/data";
import { Authenticator, Button } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { PhotoUploader } from './components/PhotoUploader';

function App() {
  return (
    <Authenticator>
      {({ signOut }) => (
        <div style={{ 
          backgroundColor: '#1a1a1a',
          minHeight: '100vh',
          padding: '2rem',
          color: '#ffffff'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h1 style={{ margin: 0 }}>Photo Upload Demo</h1>
              <Button onClick={signOut}>Sign Out</Button>
            </div>
            <PhotoUploader />
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
