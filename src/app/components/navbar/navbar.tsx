
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons'
import {
    Box,
    Flex,
    HStack,
    IconButton,
    useColorModeValue,
    useDisclosure
} from '@chakra-ui/react'

interface Props {
  children: React.ReactNode,
  href : string
}

const Links = [
    {name: 'Home', href: "/"},
    {name: 'Movimentações', href: '/api/movimentacoes'},
    {name: 'Cadastros', href: '/api/cadastros'},
    {name: 'Lançamentos esperados', href: '/api/lancamentos'}]

const NavLink = (props: Props) => {
  const { children } = props
  return (
    <Box
      as="a"
      px={2}
      py={1}
      rounded={'md'}
      _hover={{
        textDecoration: 'none',
        bg: useColorModeValue('gray.200', 'gray.700'),
      }}
      href={props.href}>
      {children}
    </Box>
  )
}

export default function WithAction() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Box bg={useColorModeValue('gray.100', 'gray.900')} px={4}>
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <IconButton
            size={'md'}
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label={'Open Menu'}
            display={{ md: 'none' }}
            onClick={isOpen ? onClose : onOpen}
          />
          <HStack spacing={8} alignItems={'center'}>
            <Box as="a" href="/">Logo</Box>
            <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
              {Links.map((link) => (
                <NavLink key={link.name} href={link.href}>{link.name}</NavLink>
              ))}
            </HStack>
          </HStack>
          
        </Flex>
      </Box>
    </>
  )
}