export default function Home() {
  return (
    <main>
      <h1>Agents Space MCP</h1>
      <p>MCP endpoint: <code>/mcp</code> (Streamable HTTP)</p>
      <pre>{`{
  "mcpServers": {
    "agents-space": { "url": "https://<this-deployment>/mcp" }
  }
}`}</pre>
    </main>
  );
}
