import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { getDataProvider, LocalDataProvider } from './data-provider-old/index.js'

function App() {
  const [count, setCount] = useState(0)
  const [reply, setReply] = useState('')
  const [dataProvider, setDataProvider] = useState<LocalDataProvider>()
  useEffect(() => {
    (async () => {
      const dp = await getDataProvider()
      if (dp)
        setDataProvider(dp?.proxy as LocalDataProvider)
    })()
  }, [])
  useEffect(() => {
    (async () => {
      const res = await dataProvider?.getList('project', { hej: 'svejs'})
      if (res?.value)
        setReply(res.value)
    })()
  }, [dataProvider])
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

