'use client'

import { ChakraProvider } from '@chakra-ui/react'
import SimpleSidebar from './components/simplesidebar/simplesidebar';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    //<html lang="en">
      <ChakraProvider>
        <SimpleSidebar />
          {children}
      </ChakraProvider>      
    //</html>
  );
}

