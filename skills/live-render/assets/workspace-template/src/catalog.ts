import { defineCatalog } from '@json-render/core'
import { schema, defineRegistry } from '@json-render/react'
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog'
import { shadcnComponents } from '@json-render/shadcn'
import { explainerSpecs, explainerComponents } from './components/explainer'
import { diagramSpecs, diagramComponents } from './components/diagrams'

export const catalog = defineCatalog(schema, {
  components: {
    // ── shadcn primitives ──────────────────────────────────────────────
    Card:         shadcnComponentDefinitions.Card,
    Stack:        shadcnComponentDefinitions.Stack,
    Grid:         shadcnComponentDefinitions.Grid,
    Separator:    shadcnComponentDefinitions.Separator,
    Tabs:         shadcnComponentDefinitions.Tabs,
    Accordion:    shadcnComponentDefinitions.Accordion,
    Collapsible:  shadcnComponentDefinitions.Collapsible,
    Dialog:       shadcnComponentDefinitions.Dialog,
    Drawer:       shadcnComponentDefinitions.Drawer,
    Tooltip:      shadcnComponentDefinitions.Tooltip,
    Popover:      shadcnComponentDefinitions.Popover,
    DropdownMenu: shadcnComponentDefinitions.DropdownMenu,
    Carousel:     shadcnComponentDefinitions.Carousel,
    Heading:      shadcnComponentDefinitions.Heading,
    Text:         shadcnComponentDefinitions.Text,
    Image:        shadcnComponentDefinitions.Image,
    Avatar:       shadcnComponentDefinitions.Avatar,
    Badge:        shadcnComponentDefinitions.Badge,
    Alert:        shadcnComponentDefinitions.Alert,
    Table:        shadcnComponentDefinitions.Table,
    Progress:     shadcnComponentDefinitions.Progress,
    Skeleton:     shadcnComponentDefinitions.Skeleton,
    Spinner:      shadcnComponentDefinitions.Spinner,
    Button:       shadcnComponentDefinitions.Button,
    Link:         shadcnComponentDefinitions.Link,
    Input:        shadcnComponentDefinitions.Input,
    Textarea:     shadcnComponentDefinitions.Textarea,
    Select:       shadcnComponentDefinitions.Select,
    Checkbox:     shadcnComponentDefinitions.Checkbox,
    Radio:        shadcnComponentDefinitions.Radio,
    Switch:       shadcnComponentDefinitions.Switch,
    Slider:       shadcnComponentDefinitions.Slider,
    Toggle:       shadcnComponentDefinitions.Toggle,
    ToggleGroup:  shadcnComponentDefinitions.ToggleGroup,
    ButtonGroup:  shadcnComponentDefinitions.ButtonGroup,
    Pagination:   shadcnComponentDefinitions.Pagination,
    // ── explainer set ─────────────────────────────────────────────────
    ...explainerSpecs,
    // ── diagram set ───────────────────────────────────────────────────
    ...diagramSpecs,
  },
  actions: {},
})

export const { registry } = defineRegistry(catalog, {
  components: {
    // ── shadcn primitives ──────────────────────────────────────────────
    Card:         shadcnComponents.Card,
    Stack:        shadcnComponents.Stack,
    Grid:         shadcnComponents.Grid,
    Separator:    shadcnComponents.Separator,
    Tabs:         shadcnComponents.Tabs,
    Accordion:    shadcnComponents.Accordion,
    Collapsible:  shadcnComponents.Collapsible,
    Dialog:       shadcnComponents.Dialog,
    Drawer:       shadcnComponents.Drawer,
    Tooltip:      shadcnComponents.Tooltip,
    Popover:      shadcnComponents.Popover,
    DropdownMenu: shadcnComponents.DropdownMenu,
    Carousel:     shadcnComponents.Carousel,
    Heading:      shadcnComponents.Heading,
    Text:         shadcnComponents.Text,
    Image:        shadcnComponents.Image,
    Avatar:       shadcnComponents.Avatar,
    Badge:        shadcnComponents.Badge,
    Alert:        shadcnComponents.Alert,
    Table:        shadcnComponents.Table,
    Progress:     shadcnComponents.Progress,
    Skeleton:     shadcnComponents.Skeleton,
    Spinner:      shadcnComponents.Spinner,
    Button:       shadcnComponents.Button,
    Link:         shadcnComponents.Link,
    Input:        shadcnComponents.Input,
    Textarea:     shadcnComponents.Textarea,
    Select:       shadcnComponents.Select,
    Checkbox:     shadcnComponents.Checkbox,
    Radio:        shadcnComponents.Radio,
    Switch:       shadcnComponents.Switch,
    Slider:       shadcnComponents.Slider,
    Toggle:       shadcnComponents.Toggle,
    ToggleGroup:  shadcnComponents.ToggleGroup,
    ButtonGroup:  shadcnComponents.ButtonGroup,
    Pagination:   shadcnComponents.Pagination,
    // ── explainer set ─────────────────────────────────────────────────
    ...explainerComponents,
    // ── diagram set ───────────────────────────────────────────────────
    ...diagramComponents,
  } as Parameters<typeof defineRegistry>[1]['components'],
})
