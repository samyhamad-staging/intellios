import clsx from 'clsx'

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  const headingClasses = clsx(
    'font-semibold text-text',
    {
      'text-2xl/8 sm:text-xl/8': level === 1,
      'text-xl/8 sm:text-lg/6': level === 2,
      'text-lg/6 sm:text-base/6': level === 3,
      'text-base/6 sm:text-sm/6': level === 4 || level === 5,
      'text-sm/6 sm:text-xs/6': level === 6,
    }
  )

  return (
    <Element
      {...props}
      className={clsx(className, headingClasses)}
    />
  )
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  const subheadingClasses = clsx(
    'font-semibold text-text',
    {
      'text-base/6': level === 2,
      'text-sm/6': level === 3 || level === 4 || level === 5,
      'text-xs/6': level === 6,
    }
  )

  return (
    <Element
      {...props}
      className={clsx(className, subheadingClasses)}
    />
  )
}
