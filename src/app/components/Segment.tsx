const Segment = ({children}) => {
    return (
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4'>
            {children}
        </div>
    )
}

export default Segment