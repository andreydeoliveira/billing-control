'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from '@chakra-ui/react';

const ModalWithDefaultValue: React.FC = () => {
    const [inputValue, setInputValue] = useState<string>('Valor Padrão');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const openModal = () => {
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.value = inputValue;
        }
    }, [isOpen, inputValue]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    return (
        <div>
            <Button onClick={openModal}>Abrir Modal</Button>
            <Modal isOpen={isOpen} onClose={closeModal}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Modal</ModalHeader>
                    <ModalBody>
                        <Input ref={inputRef} defaultValue={inputValue} onChange={handleInputChange} />
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={closeModal}>Fechar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default ModalWithDefaultValue;
