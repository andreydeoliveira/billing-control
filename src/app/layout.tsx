'use client'

import { ChakraProvider } from '@chakra-ui/react'
import NavBar from './components/navbar/navbar'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <ChakraProvider>
        <NavBar />
        {children}
      </ChakraProvider>      
    </html>
  );
}

