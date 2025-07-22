"use client"

export default function StyleTest() {
  return (
    <>
      <style>{`
        .inline-red { background-color: red; color: white; padding: 20px; }
        .inline-blue { background-color: blue; color: white; padding: 20px; margin: 10px 0; }
      `}</style>
      
      <div className="inline-red">
        <h1>Style Test Page</h1>
        <p>This should have red background (inline CSS)</p>
      </div>
      
      <div className="inline-blue">
        <p>This should have blue background (inline CSS)</p>
      </div>
      
      <div style={{ backgroundColor: 'green', color: 'white', padding: '20px', margin: '10px 0' }}>
        <p>This should have green background (inline styles)</p>
      </div>
      
      <div className="bg-yellow-500 text-black p-5 m-2">
        <p>This should have yellow background (Tailwind CSS)</p>
      </div>
      
      <div className="bg-purple-500 text-white p-5 m-2">
        <p>This should have purple background (Tailwind CSS)</p>
      </div>
      
      <div className="bg-orange-500 text-white p-5 m-2 rounded-lg">
        <p>This should have orange background with rounded corners (Tailwind CSS)</p>
      </div>
    </>
  )
}
