interface SkeletonRowProps {
  cols?: number;
}

export const SkeletonRow = ({ cols = 6 }: SkeletonRowProps) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}>
        <div className="skeleton h-4 w-full rounded"></div>
      </td>
    ))}
  </tr>
);
