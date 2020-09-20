# ds-nodes

Modular JavaScript communications and RPC system. Use ds-nodes to communicate between Node.JS instances, or between a browser page and a server.

`npm install @decthings/ds-nodes`

## Modules

ds-nodes works by plugging together modules, called a *chain* in order to solve some specific task. If a desired module is not present among the included modules, you can create a new one and use it in your chain.

A module can send and receive messages. In this context, *sending* does not mean that goes over a network, but rather from one module to another. Also, *message* can be any JavaScript value, since it doesn't get serialized.

By creating a chain of modules, which send and receive from one another, you can form a complex system. 

### Using modules

An instance of a module has a *receive* function. This is the function that you want to call whenever that module should receive a message. So, to send a message to a module, you would actually call the *receive* function on that module. Usually, however, you do not need to call the receive function. This is instead done for you, by piping together modules.

```typescript
let module1 = new MyModule()
let module2 = new MyModule()
module1.pipe(module2)
```

When we create a pipe from module1 to module2, each message that module1 sends will be received by module2. This is like instructing module1 to call the receive function on module2 for each message that module1 wants to send.

There is also a shorthand for this:

```typescript
let module1 = new MyModule()
let module2 = new MyModule([module1])
```

This example is exactly the same as the one above, but we don't have to manually call the pipe function.

#### Piping into a callback

We can also pipe a module into a function. When we do this, the function will be called for each message that the module wants to send.

```typescript
let module1 = new MyModule()
module1.pipe((message) => {
    console.log('module1 wanted to send: ', message)
})
```

#### WebSocket example

Let's look at a real-world example.

```typescript
import { WebSocketClient } from '@decthings/ds-nodes'

// Create a WebSocket client
let transport = new WebSocketTransport([], { address: 'ws://localhost:3000' })

transport.pipe((message) => {
    console.log('Received message: ' + message)
})
```

The WebSocketTransport will send a message (to the next module, not over the network) each time it receives a message over the WebSocket connection. This example will log each incoming message.

#### More complex example

Example of an RPC server using WebSocket:

```typescript
(typescript):
import { WebSocketServer, Converter, RpcServer, TryCatch } from '@decthings/ds-nodes'

// Create a server which listents on 0.0.0.0:3000
const server = new WebSocketServer([], { wsOptions: { host: '127.0.0.1', port: 3000 } })

// Parse each incoming message using JSON.parse
const parser = new Converter([server], message => {
    return { source: message.source, message: JSON.parse(message.message.toString()) }
})

// Send each parsed message to an RPC server
const rpcServer = new RpcServer([parser])

// Serialize each outgoing message using JSON.stringify
const stringifier = new Converter([rpcServer], message => {
    return { target: message.target, message: JSON.stringify(message.message) }
})

// Try to send the message back. If we fail (probably the client disconnected), do nothing.
const tryCatch = new TryCatch([stringifier])
tryCatch.pipe(server)

// Expose the function Hello, which should return "World!"
rpcServer.rpc.exposeObject({
    Hello: () => {
        return 'World!'
    }
}, 'MyRpc')
```

And here is the client:

```typescript
(typescript):
import { WebSocketTransport, JsonParser, RpcClient, JsonStringifier } from '@decthings/ds-nodes'

// Create a WebSocket client which connects to the server
// For use in broser, use BrowserWebSocketTransport instead
let transport = new WebSocketTransport([], { address: 'ws://localhost:3000' })

// Parse each incoming message
let parser = JsonParser([transport])

// Send each parsed message to a RPC client
let rpcClient = new RpcClient([parser])

// Serialize each outgoing message
let stringifier = JsonStringifier([rpcClient])
stringifier.pipe(transport)

// Create a JavaScript proxy object which allows us to call the RPC functions. The name should match the exposed object on the server.
let client = rpcClient.api('MyRpc')

// Should output Hello World!
console.log('Hello ' + await client.Hello())
```