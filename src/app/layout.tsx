"use client";

import { ChakraProvider, Flex, Container } from "@chakra-ui/react";
import NavBar from "./components/navbar/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          {/*<Flex as="header" position="fixed" backgroundColor="rgba(255,  255, 255, 0.8)" backdropFilter="saturate(180%) blur(5px)"  w="100%">*/}
          <NavBar>
            {/*</Flex>}*/}
            {children}
          </NavBar>
        </ChakraProvider>
      </body>
    </html>
  );
}
