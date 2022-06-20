// Attempt to call a read-only function from a smart contract.
import { read_only_please } from './marketplace_00_add_wl';

function Read_Only() {

  return (<>
 {read_only_please}      
 </>
  );
  
}

export default Read_Only;
