import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { LocalDataProvider } from './data-provider'
import { dataProvider } from './data-provider'

function App() {
  const [count, setCount] = useState(0)
  const [reply, setReply] = useState('')
  const [useDataProvider, setUseDataProvider] = useState<LocalDataProvider>()
  useEffect(() => {
    (async () => {
      const dp = await dataProvider()
      setUseDataProvider(dp?.proxy as LocalDataProvider)
    })()
  }, [])
  useEffect(() => {
    (async () => {
      await useDataProvider?.getList('project', { hej: 'svejs'})
    })()
  }, [useDataProvider])
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={async () => {
          setCount((count) => count + 1)
        }}>
          count is {count}, reply is {reply}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

