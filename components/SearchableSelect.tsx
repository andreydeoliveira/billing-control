'use client';

import { Select, SelectProps } from '@mantine/core';
import { useMemo, useState } from 'react';

interface SearchableSelectProps extends Omit<SelectProps, 'data'> {
  data: Array<{ value: string; label: string }>;
}

export function SearchableSelect({ data, ...props }: SearchableSelectProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredData = useMemo(() => {
    if (!searchValue) return data;
    
    return data.filter((item) =>
      item.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [data, searchValue]);

  return (
    <Select
      {...props}
      data={filteredData}
      searchable
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      nothingFoundMessage="Nenhum resultado encontrado"
      maxDropdownHeight={200}
    />
  );
}
