import { configure } from '@testing-library/react'

// Las pantallas montan íconos SVG y animaciones; en máquinas o CI cargados 1 s de espera no alcanza.
configure({ asyncUtilTimeout: 5000 })
