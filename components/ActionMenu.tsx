'use client';

import { Menu, ActionIcon, rem } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconCreditCard, IconPigMoney } from '@tabler/icons-react';

interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  onCartoes?: () => void;
  onCaixinhas?: () => void;
}

export function ActionMenu({ onEdit, onDelete, onCartoes, onCaixinhas }: ActionMenuProps) {
  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
          onClick={onEdit}
        >
          Editar
        </Menu.Item>
        {onCartoes && (
          <Menu.Item
            leftSection={<IconCreditCard style={{ width: rem(14), height: rem(14) }} />}
            onClick={onCartoes}
          >
            Cartões
          </Menu.Item>
        )}
        {onCaixinhas && (
          <Menu.Item
            leftSection={<IconPigMoney style={{ width: rem(14), height: rem(14) }} />}
            onClick={onCaixinhas}
          >
            Caixinhas
          </Menu.Item>
        )}
        <Menu.Item
          color="red"
          leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
          onClick={onDelete}
        >
          Excluir
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
