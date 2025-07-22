export default function BasicTest() {
  return (
    <div style={{ backgroundColor: 'red', color: 'white', fontFamily: 'Arial, sans-serif', padding: '20px', minHeight: '100vh' }}>
      <h1>Basic HTML/CSS Test</h1>
      <div style={{ backgroundColor: 'blue', padding: '20px', margin: '20px 0', borderRadius: '8px' }}>
        This should be a blue box with white text on a red background
      </div>
      <div style={{ backgroundColor: 'green', padding: '20px', color: 'white' }}>
        This should be a green box with inline styles
      </div>
    </div>
  )
}
