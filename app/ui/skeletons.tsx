// Update the existing skeleton components or add new ones

export function CallsChartSkeleton() {
  return (
    <div className="w-full md:col-span-4">
      <div className="h-8 w-36 rounded-md bg-gray-100" />
      <div className="mt-4 rounded-xl bg-gray-100 p-4">
        <div className="sm:grid-cols-13 mt-0 grid grid-cols-12 items-end gap-2 rounded-md bg-white p-4 md:gap-4">
          <div className="h-[350px] animate-pulse bg-gray-200" />
        </div>
        <div className="flex items-center pb-2 pt-6">
          <div className="h-5 w-5 rounded-full bg-gray-200" />
          <div className="ml-2 h-4 w-20 rounded-md bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function LatestCallsSkeleton() {
  return (
    <div className="flex w-full flex-col md:col-span-4">
      <div className="h-8 w-36 rounded-md bg-gray-100" />
      <div className="flex grow flex-col justify-between rounded-xl bg-gray-100 p-4">
        <div className="bg-white px-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex flex-row items-center justify-between py-4"
            >
              <div className="flex items-center">
                <div className="min-w-0">
                  <div className="h-5 w-32 rounded-md bg-gray-200" />
                  <div className="mt-2 h-4 w-24 rounded-md bg-gray-200" />
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="h-5 w-20 rounded-md bg-gray-200" />
                <div className="mt-2 h-4 w-16 rounded-md bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-gray-100 p-4"
        >
          <div className="h-8 w-36 rounded-md bg-gray-200" />
          <div className="mt-4 h-4 w-24 rounded-md bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <>
      <CardsSkeleton />
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <CallsChartSkeleton />
        <LatestCallsSkeleton />
      </div>
    </>
  );
}

export function CallsTableSkeleton() {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="mb-2 w-full rounded-md bg-white p-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                  <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div className="h-5 w-16 animate-pulse rounded-md bg-gray-200" />
                  <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}