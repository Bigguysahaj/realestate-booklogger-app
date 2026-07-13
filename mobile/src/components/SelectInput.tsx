import React, { useState } from "react";
import { Menu, TextInput } from "react-native-paper";

interface Props {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** A read-only TextInput that opens a Menu of options; tap the current
 *  option again to clear it. */
export default function SelectInput({ label, value, options, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchorPosition="bottom"
      anchor={
        <TextInput
          mode="outlined"
          label={label}
          value={value}
          editable={false}
          disabled={disabled}
          right={<TextInput.Icon icon="menu-down" onPress={() => !disabled && setOpen(true)} />}
          onPressIn={() => !disabled && setOpen(true)}
        />
      }
    >
      {options.map((option) => (
        <Menu.Item
          key={option}
          title={option}
          trailingIcon={option === value ? "check" : undefined}
          onPress={() => {
            onChange(option === value ? "" : option);
            setOpen(false);
          }}
        />
      ))}
    </Menu>
  );
}
